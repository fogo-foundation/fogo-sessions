use crate::config_manager::config::{default_one, Config, Domain};
use crate::constraint::TransactionVariation;
use serde_json::Value;
use sqlx::{types::Json, FromRow};
use std::collections::HashMap;
use uuid::Uuid;

use crate::db::pool;

/// Database row where JSON is untyped.
#[derive(FromRow)]
struct RawRow {
    domain_id: Uuid,
    domain: String,
    enable_session_management: bool,
    enable_preflight_simulation: bool,
    transaction_variation: Json<Value>,
}

pub async fn load_config() -> Result<Config, sqlx::Error> {
    let rows: Vec<RawRow> = sqlx::query_as::<_, RawRow>(
        r#"
        SELECT
          d.id            AS domain_id,
          d.domain        AS domain,
          d.enable_session_management,
          d.enable_preflight_simulation,
          v.transaction_variation  AS transaction_variation
        FROM domain_config d
        JOIN variation v ON v.domain_config_id = d.id
        ORDER BY d.id
        "#,
    )
    .fetch_all(pool::pool())
    .await?;

    let mut map: HashMap<Uuid, Domain> = HashMap::new();

    for RawRow {
        domain_id,
        domain,
        enable_session_management,
        enable_preflight_simulation,
        transaction_variation,
    } in rows
    {
        let transaction_variation: TransactionVariation =
            match serde_json::from_value(transaction_variation.0) {
                Ok(tv) => tv,
                Err(err) => {
                    // log and skip this row instead of failing the whole query
                    tracing::warn!(
                        ?err,
                        ?domain,
                        "Skipping row with invalid transaction_variation"
                    );
                    continue;
                }
            };

        let domain_ref = map.entry(domain_id).or_insert_with(|| Domain {
            domain,
            enable_session_management,
            enable_preflight_simulation,
            number_of_signers: default_one(), // TODO: Get number of signers from database
            tx_variations: HashMap::new(),
        });

        domain_ref.tx_variations.insert(
            transaction_variation.0.name().to_string(),
            transaction_variation.0,
        );
    }

    Ok(Config {
        domains: map.into_values().collect(),
    })
}
