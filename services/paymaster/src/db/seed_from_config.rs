use crate::config::{Config, Domain};
use crate::constraint::TransactionVariation;
use crate::db::pool::pool;
use sqlx::types::Json;
use url::{Host, Position, Url};

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Algorithm, Argon2, Params, Version,
};
use uuid::Uuid;

pub fn hash_password(plain: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);

    // Argon2 with default params (Argon2id v19)
    let argon2 = Argon2::default();

    // Hash password to PHC string ($argon2id$v=19$...)
    argon2
        .hash_password(plain.as_bytes(), &salt)
        .unwrap()
        .to_string()
}

async fn insert_user(email: &str, password: &str) -> Result<Uuid, sqlx::Error> {
    let password = hash_password(password);
    let user = sqlx::query_as::<_, (Uuid,)>(
        "INSERT INTO \"user\" (email, password) VALUES ($1, $2) RETURNING id",
    )
    .bind(email)
    .bind(&password)
    .fetch_one(pool())
    .await?;

    Ok(user.0)
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

pub async fn seed_from_config(config: &Config) -> Result<(), sqlx::Error> {
    let user_count = sqlx::query_as::<_, (i64,)>("SELECT count(*) from \"user\"")
        .fetch_one(pool())
        .await?;

    let password = hash_password("admin");
    if user_count.0 == 0 {
        for domain in &config.domains {
            let domain_url = Url::parse(&domain.domain).unwrap();
            let host = domain_url.host().unwrap();
            let user_email = format!("admin@{}", &host.to_string());
            let user = insert_user(&user_email, &password).await?;
            let app = insert_app(&user, &host.to_string()).await?;
            let domain_config = insert_domain_config(&app, &domain).await?;
            for variation in &domain.tx_variations {
                insert_variation(&domain_config, &variation).await?;
            }
        }
    }

    Ok(())
}
