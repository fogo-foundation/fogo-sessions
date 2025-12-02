use anyhow::Result;
use clap::Parser;
use config::File;
use fogo_paymaster::config_manager::config::Config;
use fogo_paymaster::config_manager::config::Domain;
use fogo_paymaster::constraint::TransactionVariation;
use fogo_paymaster::db::pool::pool;
use serde::{Deserialize, Serialize};
use sqlx::Type;
use url::Url;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Type, Deserialize, Serialize)]
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
    /// Postgres connection string (required via flag or env)
    #[arg(short = 'd', long = "db-url", env = "DATABASE_URL")]
    pub db_url: String,

    /// Path to TOML config used to populate the DB (required via flag or env)
    #[arg(short, long, env = "CONFIG_FILE")]
    pub config: String,
}

// Get the registrable domain from a URL.
// Example: https://test.brasa.finance -> brasa.finance
fn registrable_domain(host: &str) -> Result<String, anyhow::Error> {
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() >= 2 {
        Ok(format!(
            "{}.{}",
            parts[parts.len() - 2],
            parts[parts.len() - 1]
        ))
    } else {
        Ok(host.to_string())
    }
}
/// Insert a user(username, wallet_address) into the database.
async fn insert_user(host: &str) -> Result<Uuid, anyhow::Error> {
    let username = registrable_domain(host)?;
    let existing_user = sqlx::query_as::<_, (Uuid,)>("SELECT id FROM \"user\" WHERE username = $1")
        .bind(&username)
        .fetch_optional(pool())
        .await?;

    if let Some(user_result) = existing_user {
        return Ok(user_result.0);
    }

    let new_user = sqlx::query_as::<_, (Uuid,)>(
        "INSERT INTO \"user\" (id, username, wallet_address) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(Uuid::new_v4())
    .bind(&username)
    .bind(format!("wallet-address-{username}"))
    .fetch_one(pool())
    .await?;

    Ok(new_user.0)
}

async fn insert_app(user_id: &Uuid, name: &str) -> Result<Uuid, sqlx::Error> {
    let existing_app =
        sqlx::query_as::<_, (Uuid,)>("SELECT id FROM app WHERE user_id = $1 AND name = $2")
            .bind(user_id)
            .bind(name)
            .fetch_optional(pool())
            .await?;

    if let Some(app_result) = existing_app {
        return Ok(app_result.0);
    }
    println!("Inserting new app: {name}");
    let app = sqlx::query_as::<_, (Uuid,)>(
        "INSERT INTO app (id, name, user_id) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(Uuid::new_v4())
    .bind(name)
    .bind(user_id)
    .fetch_one(pool())
    .await?;

    Ok(app.0)
}
async fn insert_or_update_domain_config(
    app_id: &Uuid,
    domain: &Domain,
) -> Result<Uuid, sqlx::Error> {
    let res = sqlx::query!(
        r#"
        INSERT INTO domain_config (
          id,
          app_id,
          domain,
          enable_session_management,
          enable_preflight_simulation
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (app_id, domain)
        DO UPDATE SET
          enable_session_management   = EXCLUDED.enable_session_management,
          enable_preflight_simulation = EXCLUDED.enable_preflight_simulation
        RETURNING id
        "#,
        Uuid::new_v4(),
        app_id,
        domain.domain, // assuming String
        domain.enable_session_management,
        domain.enable_preflight_simulation,
    )
    .fetch_one(pool())
    .await?;

    Ok(res.id)
}

async fn insert_or_update_variation(
    domain_config_id: &Uuid,
    variation: &TransactionVariation,
) -> Result<Uuid, anyhow::Error> {
    // 1. Build JSON + metadata
    let transaction_variation_json = match variation {
        TransactionVariation::V0(v) => {
            // Convert Pubkeys to strings (base58)
            let pubkey_strings: Vec<String> = v
                .whitelisted_programs
                .iter()
                .map(|k| k.to_string())
                .collect();
            serde_json::to_string(&pubkey_strings)
        }
        TransactionVariation::V1(v) => serde_json::to_string(&v.instructions),
    }
    .map_err(|e| anyhow::anyhow!("Error serializing transaction variation: {e}"))?;

    let version = match variation {
        TransactionVariation::V0(_) => VariationVersion::V0,
        TransactionVariation::V1(_) => VariationVersion::V1,
    };

    let max_gas_spend = match variation {
        TransactionVariation::V0(_) => None,
        TransactionVariation::V1(v) => Some(v.max_gas_spend as i64),
    };

    let new_id = Uuid::new_v4();

    // 2. Single upsert by (domain_config_id, name)
    let row = sqlx::query!(
        r#"
    INSERT INTO variation (
      id,
      domain_config_id,
      name,
      version,
      max_gas_spend,
      transaction_variation
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (domain_config_id, name)
    DO UPDATE SET
      version               = EXCLUDED.version,
      max_gas_spend         = EXCLUDED.max_gas_spend,
      transaction_variation = EXCLUDED.transaction_variation
    RETURNING id
    "#,
        new_id,
        domain_config_id,
        variation.name(),
        version,                    // VariationVersion
        max_gas_spend,              // Option<i64>
        transaction_variation_json, // serde_json::Value
    )
    .fetch_one(pool())
    .await?;

    Ok(row.id)
}

pub async fn sync_from_config(config: &Config) -> Result<(), anyhow::Error> {
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

        let user = insert_user(&host).await?;
        let app = insert_app(&user, &host).await?;
        let domain_config = insert_or_update_domain_config(&app, domain).await?;
        for variation in domain.tx_variations.values() {
            insert_or_update_variation(&domain_config, variation).await?;
        }
    }

    Ok(())
}

pub fn load_file_config(config_path: &str) -> Result<Config> {
    let config: Config = config::Config::builder()
        .add_source(File::with_name(config_path))
        .build()?
        .try_deserialize()?;
    Ok(config)
}

async fn run_seed(db_url: &str, config_path: &str) -> anyhow::Result<()> {
    fogo_paymaster::db::pool::init_db_connection(db_url).await?;
    let config = load_file_config(config_path)?;
    sync_from_config(&config).await?;
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv()?;
    let opts = Cli::parse();

    run_seed(&opts.db_url, &opts.config).await?;
    Ok(())
}
