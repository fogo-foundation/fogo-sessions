use anyhow::Result;
use clap::Parser;
use config::File;
use fogo_paymaster::config_manager::config::Config;
use fogo_paymaster::config_manager::config::Domain;
use fogo_paymaster::constraint::TransactionVariation;
use fogo_paymaster::db::pool::pool;
use url::Url;
use uuid::NoContext;
use uuid::Timestamp;
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
    .bind(Uuid::new_v7(Timestamp::now(NoContext)))
    .bind(&username)
    .bind(format!("wallet-address-{username}"))
    .fetch_one(pool())
    .await?;

    Ok(new_user.0)
}

async fn insert_app(user_id: &Uuid, name: &str) -> Result<Uuid, sqlx::Error> {
    let app =
        sqlx::query_as::<_, (Uuid,)>("INSERT INTO app (id, name) VALUES ($1, $2) RETURNING id")
            .bind(Uuid::new_v7(Timestamp::now(NoContext)))
            .bind(name)
            .fetch_one(pool())
            .await?;

    sqlx::query_as::<_, (Uuid,)>("INSERT INTO app_user (app_id, user_id) VALUES ($1, $2)")
        .bind(app.0)
        .bind(user_id)
        .fetch_optional(pool())
        .await?;

    Ok(app.0)
}

async fn insert_domain_config(app_id: &Uuid, domain: &Domain) -> Result<Uuid, sqlx::Error> {
    let domain_config = sqlx::query_as::<_, (Uuid,)>(
        "INSERT INTO domain_config (id, app_id, domain, enable_session_management, enable_preflight_simulation) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    )
    .bind(Uuid::new_v7(Timestamp::now(NoContext)))
    .bind(app_id)
    .bind(domain.domain.to_string())
    .bind(domain.enable_session_management)
    .bind(domain.enable_preflight_simulation)
    .fetch_one(pool())
    .await?;

    Ok(domain_config.0)
}

async fn insert_variation(
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
    let variation = sqlx::query_as::<_, (Uuid,)>(
        "INSERT INTO variation (id, domain_config_id, name, version, max_gas_spend, transaction_variation) VALUES ($1, $2, $3, $4::variation_version, $5::bigint, $6::jsonb) RETURNING id",
    )
    .bind(Uuid::new_v7(Timestamp::now(NoContext)))
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
    let user_count = sqlx::query_as::<_, (i64,)>("SELECT count(*) from \"user\"")
        .fetch_one(pool())
        .await?;

    if user_count.0 == 0 {
        tracing::info!("Seeding database from config");
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
            let domain_config = insert_domain_config(&app, domain).await?;
            for variation in domain.tx_variations.values() {
                insert_variation(&domain_config, variation).await?;
            }
        }
    } else {
        tracing::info!("Some users already exist, skipping seeding");
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
