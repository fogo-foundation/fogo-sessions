use anyhow::Result;
use clap::Parser;
use config::File;
use fogo_paymaster::cli::NetworkEnvironment as CliNetworkEnvironment;
use fogo_paymaster::config_manager::config::Config;
use fogo_paymaster::config_manager::config::Domain;
use fogo_paymaster::constraint::config::TransactionVariation;
use fogo_paymaster::db::config::NetworkEnvironment;
use fogo_paymaster::db::pool::pool;
use serde::{Deserialize, Serialize};
use sqlx::Type;
use url::Url;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, Type, Eq, PartialOrd, Ord, Deserialize, Serialize)]
#[sqlx(type_name = "variation_version")]
pub enum VariationVersion {
    #[sqlx(rename = "v0")]
    V0,

    #[sqlx(rename = "v1")]
    V1,
}

#[derive(Debug, Parser)]
#[command(version, about)]
pub struct Cli {
    /// Postgres connection string
    #[arg(short = 'd', long = "db-url", env = "DATABASE_URL")]
    pub db_url: String,

    /// Path to TOML config used to populate the DB
    #[arg(short, long, env = "CONFIG_FILE")]
    pub config: String,

    /// Network environment to sync as
    #[arg(short, long, env = "NETWORK_ENVIRONMENT")]
    pub network_environment: CliNetworkEnvironment,
}

// Get the registrable domain from a URL.
// Example: https://test.brasa.finance -> brasa.finance
fn registrable_domain(host: &str) -> Result<String, anyhow::Error> {
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() >= 2 {
        Ok(format!(
            "{}.{}",
            parts
                .get(parts.len() - 2)
                .expect("parts.len() >= 2 in this branch"),
            parts.last().expect("parts.len() >= 2 in this branch")
        ))
    } else {
        Ok(host.to_string())
    }
}

async fn insert_or_return_user(host: &str) -> Result<Uuid, anyhow::Error> {
    let username = registrable_domain(host)?;

    let inserted = sqlx::query!(
        r#"
        INSERT INTO "user" (id, username, wallet_address)
        VALUES ($1, $2, $3)
        ON CONFLICT (username)
        DO NOTHING
        RETURNING id, username
        "#,
        Uuid::new_v4(),
        username,
        format!("wallet-address-{username}")
    )
    .fetch_optional(pool())
    .await?;

    if let Some(row) = inserted {
        println!("Inserted user: {:?}", row.username);
        return Ok(row.id);
    }

    let existing = sqlx::query!(r#"SELECT id FROM "user" WHERE username = $1"#, username)
        .fetch_one(pool())
        .await?;

    Ok(existing.id)
}

async fn insert_or_return_app(user_id: &Uuid, name: &str) -> Result<Uuid, sqlx::Error> {
    let new_id = Uuid::new_v4();

    let inserted = sqlx::query!(
        r#"
        INSERT INTO app (id, user_id, name)
        VALUES ($1, $2, $3)
        ON CONFLICT (name)
        DO NOTHING
        RETURNING id, name
        "#,
        new_id,
        user_id,
        name,
    )
    .fetch_optional(pool())
    .await?;

    if let Some(row) = inserted {
        println!("Inserted app: {:?}", row.name);
        return Ok(row.id);
    }

    let existing = sqlx::query!(
        r#"SELECT id FROM app WHERE user_id = $1 AND name = $2"#,
        user_id,
        name
    )
    .fetch_one(pool())
    .await?;

    Ok(existing.id)
}

async fn insert_or_update_domain_config(
    app_id: &Uuid,
    domain: &Domain,
    network_environment: &NetworkEnvironment,
) -> Result<Uuid, sqlx::Error> {
    let res = sqlx::query!(
        r#"
        INSERT INTO domain_config (
          id,
          app_id,
          domain,
          enable_session_management,
          enable_preflight_simulation,
          network_environment
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (domain, network_environment)
        DO UPDATE SET
          enable_session_management   = EXCLUDED.enable_session_management,
          enable_preflight_simulation = EXCLUDED.enable_preflight_simulation
        RETURNING id, domain
        "#,
        Uuid::new_v4(),
        app_id,
        domain.domain,
        domain.enable_session_management,
        domain.enable_preflight_simulation,
        network_environment as _,
    )
    .fetch_one(pool())
    .await?;
    Ok(res.id)
}

async fn insert_or_update_variation(
    domain_config_id: &Uuid,
    variation: &TransactionVariation,
) -> Result<Uuid, anyhow::Error> {
    let transaction_variation_json = match variation {
        TransactionVariation::V0(v) => {
            let pubkey_strings: Vec<String> = v
                .whitelisted_programs
                .iter()
                .map(|k| k.to_string())
                .collect();
            serde_json::to_value(&pubkey_strings)
        }
        TransactionVariation::V1(v) => serde_json::to_value(&v.instructions),
    }
    .map_err(|e| anyhow::anyhow!("Error serializing transaction variation: {e}"))?;

    let version = match variation {
        TransactionVariation::V0(_) => VariationVersion::V0,
        TransactionVariation::V1(_) => VariationVersion::V1,
    };

    let max_gas_spend = match variation {
        TransactionVariation::V0(_) => None,
        TransactionVariation::V1(v) => Some(
            i64::try_from(v.max_gas_spend)
                .map_err(|_| anyhow::anyhow!("failed to convert max_gas_spend to i64"))?,
        ),
    };

    let swap_into_fogo = match variation {
        TransactionVariation::V0(_) => None,
        TransactionVariation::V1(v) => Some(serde_json::to_value(&v.swap_into_fogo)?),
    };

    let paymaster_fee_lamports =
        match variation {
            TransactionVariation::V0(_) => None,
            TransactionVariation::V1(v) => match v.paymaster_fee_lamports {
                Some(val) => Some(i64::try_from(val).map_err(|_| {
                    anyhow::anyhow!("failed to convert paymaster_fee_lamports to i64")
                })?),
                None => None,
            },
        };

    let row = sqlx::query!(
        r#"
    INSERT INTO variation (
      id,
      domain_config_id,
      name,
      version,
      max_gas_spend,
      transaction_variation,
      swap_into_fogo,
      paymaster_fee_lamports
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (domain_config_id, name)
    DO UPDATE SET
      version               = EXCLUDED.version,
      max_gas_spend         = EXCLUDED.max_gas_spend,
      transaction_variation = EXCLUDED.transaction_variation,
      swap_into_fogo         = EXCLUDED.swap_into_fogo,
      paymaster_fee_lamports = EXCLUDED.paymaster_fee_lamports
    RETURNING id
    "#,
        Uuid::new_v4(),
        domain_config_id,
        variation.name(),
        version as _,
        max_gas_spend,
        transaction_variation_json,
        swap_into_fogo,
        paymaster_fee_lamports,
    )
    .fetch_one(pool())
    .await?;

    Ok(row.id)
}

pub async fn sync_from_config(
    config: &Config,
    network_environment: NetworkEnvironment,
) -> Result<(), anyhow::Error> {
    println!("Syncing database from config");
    for domain in &config.domains {
        // try to parse the domain as a url and get the host or just return the domain if it's not a valid url
        let host = match Url::parse(&domain.domain) {
            Ok(url) => url
                .host_str()
                .map(|h| h.to_string())
                .unwrap_or_else(|| domain.domain.clone()),
            Err(_) => domain.domain.clone(),
        };

        let user = insert_or_return_user(&host).await?;
        let app = insert_or_return_app(&user, &host).await?;
        let domain_config =
            insert_or_update_domain_config(&app, domain, &network_environment).await?;
        for variation in domain.tx_variations.values() {
            insert_or_update_variation(&domain_config, variation).await?;
        }
    }
    println!("Done.");

    Ok(())
}

pub fn load_file_config(config_path: &str) -> Result<Config> {
    let config: Config = config::Config::builder()
        .add_source(File::with_name(config_path))
        .build()?
        .try_deserialize()?;
    Ok(config)
}

async fn run_sync_config(
    db_url: &str,
    config_path: &str,
    network_environment: NetworkEnvironment,
) -> anyhow::Result<()> {
    fogo_paymaster::db::pool::init_db_connection(db_url).await?;
    let config = load_file_config(config_path)?;
    sync_from_config(&config, network_environment).await?;
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let opts = Cli::parse();

    println!("Loading config from: {}", opts.config);
    let network_environment = opts.network_environment.into();

    run_sync_config(&opts.db_url, &opts.config, network_environment).await?;
    Ok(())
}
