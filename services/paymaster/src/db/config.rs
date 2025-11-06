use crate::config_manager::config::{Config, Domain};
use crate::constraint::TransactionVariation;
use sqlx::{types::Json, FromRow};
use std::collections::HashMap;
use uuid::Uuid;

use crate::db::pool;

/// A row from the database that represents a domain and its transaction variations.
#[derive(FromRow)]
struct Row {
    domain_id: Uuid,
    domain: String,
    enable_session_management: bool,
    enable_preflight_simulation: bool,
    transaction_variation: Json<TransactionVariation>,
}

pub async fn load_config() -> Result<Config, sqlx::Error> {
    let rows: Vec<Row> = sqlx::query_as::<_, Row>(
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

    let map: HashMap<Uuid, Domain> = rows.into_iter().fold(HashMap::new(), |mut acc, r| {
        if let std::collections::hash_map::Entry::Vacant(e) = acc.entry(r.domain_id) {
            let domain = Domain {
                domain: r.domain,
                enable_session_management: r.enable_session_management,
                enable_preflight_simulation: r.enable_preflight_simulation,
                tx_variations: vec![r.transaction_variation.0],
            };
            e.insert(domain);
        } else {
            acc.get_mut(&r.domain_id)
                .unwrap()
                .tx_variations
                .push(r.transaction_variation.0);
        }
        acc
    });

    Ok(Config {
        domains: map.into_values().collect(),
    })
}
