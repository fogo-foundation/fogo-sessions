use anyhow::Result;
use clap::Parser;
use config::File;
use fogo_paymaster::config_manager::config::Config;
use fogo_paymaster::config_manager::config::Domain;
use fogo_paymaster::constraint::TransactionVariation;
use fogo_paymaster::db::pool::pool;
use url::Url;
use uuid::Uuid;

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
    let existing_domain_config = sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM domain_config WHERE app_id = $1 AND domain = $2",
    )
    .bind(app_id)
    .bind(domain.domain.to_string())
    .fetch_optional(pool())
    .await?;

    if let Some(domain_config_result) = existing_domain_config {
        let id = domain_config_result.0;
        let res = sqlx::query(
            r#"
                UPDATE domain_config
                SET
                enable_session_management      = $1,
                enable_preflight_simulation    = $2
                WHERE id = $3
                AND (
                    enable_session_management   IS DISTINCT FROM $1 OR
                    enable_preflight_simulation IS DISTINCT FROM $2
                )
            "#,
        )
        .bind(domain.enable_session_management)
        .bind(domain.enable_preflight_simulation)
        .bind(id)
        .execute(pool())
        .await?;

        if res.rows_affected() > 0 {
            println!("Updated domain config: {}", domain.domain);
        }

        return Ok(id);
    }
    println!("Inserting new domain config: {}", domain.domain);
    let domain_config = sqlx::query_as::<_, (Uuid,)>(
        "INSERT INTO domain_config (id, app_id, domain, enable_session_management, enable_preflight_simulation) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    )
    .bind(Uuid::new_v4())
    .bind(app_id)
    .bind(domain.domain.to_string())
    .bind(domain.enable_session_management)
    .bind(domain.enable_preflight_simulation)
    .fetch_one(pool())
    .await?;

    Ok(domain_config.0)
}

async fn insert_or_update_variation(
    domain_config_id: &Uuid,
    variation: &TransactionVariation,
) -> Result<Uuid, anyhow::Error> {
    let transaction_variation_json = match variation {
        TransactionVariation::V0(v) => {
            // Convert Pubkeys to strings (base58 format) before serializing
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
        TransactionVariation::V0(_) => "v0",
        TransactionVariation::V1(_) => "v1",
    };
    let max_gas_spend = match variation {
        TransactionVariation::V0(_) => None,
        TransactionVariation::V1(v) => Some(v.max_gas_spend as i64),
    };
    let existing_variation = sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM variation WHERE domain_config_id = $1 AND name = $2 ",
    )
    .bind(domain_config_id)
    .bind(variation.name())
    .fetch_optional(pool())
    .await?;

    if let Some(variation_result) = existing_variation {
        let id = variation_result.0;

        let res = sqlx::query(
            r#"
                UPDATE variation
                SET
                max_gas_spend        = $1::bigint,
                transaction_variation = $2::jsonb
                WHERE id = $3
                AND (
                    max_gas_spend        IS DISTINCT FROM $1::bigint OR
                    transaction_variation IS DISTINCT FROM $2::jsonb
                )
            "#,
        )
        .bind(max_gas_spend)
        .bind(&transaction_variation_json)
        .bind(id)
        .execute(pool())
        .await?;

        if res.rows_affected() > 0 {
            println!("Updated variation: {}", variation.name());
        }

        return Ok(id);
    }
    println!("Inserting new variation: {}", variation.name());
    let variation = sqlx::query_as::<_, (Uuid,)>(
        "INSERT INTO variation (id, domain_config_id, name, version, max_gas_spend, transaction_variation) VALUES ($1, $2, $3, $4::variation_version, $5::bigint, $6::jsonb) RETURNING id",
    )
    .bind(Uuid::new_v4())
    .bind(domain_config_id)
    .bind(variation.name())
    .bind(version)
    .bind(max_gas_spend)
    .bind(transaction_variation_json)
    .fetch_one(pool())
    .await?;

    Ok(variation.0)
}

/// Seed the database from the config.
pub async fn seed_from_config(config: &Config) -> Result<(), anyhow::Error> {
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
    seed_from_config(&config).await?;
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv()?;
    let opts = Cli::parse();

    run_seed(&opts.db_url, &opts.config).await?;
    Ok(())
}
