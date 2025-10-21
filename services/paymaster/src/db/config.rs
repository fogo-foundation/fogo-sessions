use crate::config_manager::config::{Config, Domain};
use crate::constraint::TransactionVariation;
use crate::db::pool::pool;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use sqlx::{types::Json, FromRow};
use std::collections::HashMap;
use url::Url;
use uuid::Uuid;

use crate::db::pool;

/// A row from the database that represents a domain and its transaction variations.
#[derive(FromRow)]
struct Row {
    domain_id: Uuid,
    domain: String,
    enable_session_management: bool,
    enable_preflight_simulation: bool,
    instructions: Json<TransactionVariation>,
}

/// Load the config from the database
pub async fn load_config() -> Result<Config, sqlx::Error> {
    let rows: Vec<Row> = sqlx::query_as::<_, Row>(
        r#"
        SELECT
          d.id            AS domain_id,
          d.domain        AS domain,
          d.enable_session_management,
          d.enable_preflight_simulation,
          v.instructions  AS instructions
        FROM domain_config d
        JOIN variation v ON v.domain_config_id = d.id
        ORDER BY d.id
        "#,
    )
    .fetch_all(pool::pool())
    .await?;

    let map: HashMap<Uuid, Domain> = rows.into_iter().fold(HashMap::new(), |mut acc, r| {
        let domain = Domain {
            domain: r.domain,
            enable_session_management: r.enable_session_management,
            enable_preflight_simulation: r.enable_preflight_simulation,
            tx_variations: vec![r.instructions.0],
        };
        acc.insert(r.domain_id, domain);
        acc
    });

    Ok(Config {
        domains: map.into_values().collect(),
    })
}

/// Hash a plaintext password using Argon2.
fn hash_password(plain: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(plain.as_bytes(), &salt)
        .unwrap()
        .to_string()
}

// Get the registrable domain from a URL.
// Example: https://test.brasa.finance -> brasa.finance
fn registrable_domain(u: &Url) -> Option<String> {
    let host = u.host_str()?;
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() >= 2 {
        Some(format!(
            "{}.{}",
            parts[parts.len() - 2],
            parts[parts.len() - 1]
        ))
    } else {
        Some(host.to_string())
    }
}
/// Insert a user(email, password) into the database.
async fn insert_user(domain_url: &Url, default_user_password: &str) -> Result<Uuid, sqlx::Error> {
    let password = hash_password(default_user_password);
    let email = format!("admin@{}", registrable_domain(domain_url).unwrap());
    let existing_user = sqlx::query_as::<_, (Uuid,)>("SELECT id FROM \"user\" WHERE email = $1")
        .bind(&email)
        .fetch_optional(pool())
        .await?;

    if let Some(user_result) = existing_user {
        return Ok(user_result.0);
    }

    let new_user = sqlx::query_as::<_, (Uuid,)>(
        "INSERT INTO \"user\" (email, password) VALUES ($1, $2) RETURNING id",
    )
    .bind(&email)
    .bind(&password)
    .fetch_one(pool())
    .await?;

    Ok(new_user.0)
}

async fn insert_app(user_id: &Uuid, name: &str) -> Result<Uuid, sqlx::Error> {
    let app = sqlx::query_as::<_, (Uuid,)>(
        "INSERT INTO app (user_id, name) VALUES ($1, $2) RETURNING id",
    )
    .bind(user_id)
    .bind(name)
    .fetch_one(pool())
    .await?;

    Ok(app.0)
}

async fn insert_domain_config(app_id: &Uuid, domain: &Domain) -> Result<Uuid, sqlx::Error> {
    let domain_config = sqlx::query_as::<_, (Uuid,)>(
        "INSERT INTO domain_config (app_id, domain, enable_session_management, enable_preflight_simulation) VALUES ($1, $2, $3, $4) RETURNING id",
    )
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
        "INSERT INTO variation (domain_config_id, instructions) VALUES ($1, $2) RETURNING id",
    )
    .bind(domain_config_id)
    .bind(Json(&variation))
    .fetch_one(pool())
    .await?;

    Ok(variation.0)
}

/// Seed the database from the config.
pub async fn seed_from_config(
    config: &Config,
    default_user_password: &str,
) -> Result<(), sqlx::Error> {
    let user_count = sqlx::query_as::<_, (i64,)>("SELECT count(*) from \"user\"")
        .fetch_one(pool())
        .await?;

    if user_count.0 == 0 {
        tracing::info!("Seeding database from config");
        for domain in &config.domains {
            let domain_url = Url::parse(&domain.domain).unwrap();
            let host = domain_url.host().unwrap();
            let user = insert_user(&domain_url, default_user_password).await?;
            let app = insert_app(&user, &host.to_string()).await?;
            let domain_config = insert_domain_config(&app, domain).await?;
            for variation in &domain.tx_variations {
                insert_variation(&domain_config, variation).await?;
            }
        }
    } else {
        tracing::warn!("Some users already exist, skipping seeding");
    }

    Ok(())
}
