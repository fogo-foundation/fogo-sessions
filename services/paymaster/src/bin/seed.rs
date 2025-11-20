use anyhow::Result;
use clap::Parser;
use config::File;
use fogo_paymaster::config_manager::config::Config;
use fogo_paymaster::config_manager::config::Domain;
use fogo_paymaster::constraint::TransactionVariation;
use fogo_paymaster::db::pool::pool;
use sqlx::types::Json;
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
) -> Result<Uuid, sqlx::Error> {
    let variation = sqlx::query_as::<_, (Uuid,)>(
        "INSERT INTO variation (id, domain_config_id, transaction_variation) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(Uuid::new_v7(Timestamp::now(NoContext)))
    .bind(domain_config_id)
    .bind(Json(&variation))
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
            let domain_url = Url::parse(&domain.domain).unwrap();
            let host = domain_url
                .host_str()
                .ok_or(anyhow::anyhow!("Invalid URL"))?;
            let user = insert_user(host).await?;
            let app = insert_app(&user, host).await?;
            let domain_config = insert_domain_config(&app, domain).await?;
            for (_, variation) in &domain.tx_variations {
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
