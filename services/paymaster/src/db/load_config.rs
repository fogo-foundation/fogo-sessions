use std::collections::HashMap;

use crate::{config_manager::config::Config, constraint::TransactionVariation};
use sqlx::{types::Json, FromRow};
use uuid::Uuid;

use crate::db::pool;

#[derive(FromRow)]
struct Row {
    domain_id: Uuid,
    domain: String,
    enable_session_management: bool,
    enable_preflight_simulation: bool,
    instructions: Json<TransactionVariation>,
}

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
    // Accumulate by domain_id
    struct DomainAccum {
        domain: String,
        enable_session_management: bool,
        enable_preflight_simulation: bool,
        variations: Vec<TransactionVariation>,
    }

    let mut map: HashMap<Uuid, DomainAccum> = HashMap::new();

    for r in rows {
        map.entry(r.domain_id)
            .or_insert_with(|| DomainAccum {
                domain: r.domain,
                enable_session_management: r.enable_session_management,
                enable_preflight_simulation: r.enable_preflight_simulation,
                variations: Vec::new(),
            })
            .variations
            .push(r.instructions.0);
    }

    // Convert to your Config type
    let mut config = Config {
        domains: Vec::new(),
    };

    for (_, d) in map {
        config.domains.push(crate::config_manager::config::Domain {
            domain: d.domain,
            enable_session_management: d.enable_session_management,
            enable_preflight_simulation: d.enable_preflight_simulation,
            tx_variations: d.variations,
        });
    }

    Ok(config)
}
