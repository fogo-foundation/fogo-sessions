use crate::config_manager::config::{Config, Domain};
use crate::constraint::{
    TransactionVariation, VariationOrderedInstructionConstraints, VariationProgramWhitelist,
};
use serde_json::Value;
use solana_pubkey::Pubkey;
use sqlx::{
    types::{Json, JsonValue},
    FromRow,
};
use std::collections::HashMap;
use std::str::FromStr;
use uuid::Uuid;

use crate::db::pool;

/// Database row where JSON is untyped.
#[derive(FromRow)]
struct RawRow {
    domain_id: Uuid,
    domain: String,
    enable_session_management: bool,
    enable_preflight_simulation: bool,
    version: String,
    name: String,
    max_gas_spend: Option<i64>,
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
          v.version::text AS version,
          v.name          AS name,
          v.max_gas_spend AS max_gas_spend,
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
        version,
        name,
        max_gas_spend,
        transaction_variation,
    } in rows
    {
        let transaction_variation_fin: TransactionVariation;

        if version == "v0" {
            // Extract the whitelisted_programs array as Vec<String>
            let strings: Vec<String> = match transaction_variation.0 {
                JsonValue::Array(arr) => arr
                    .iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect(),
                _ => {
                    tracing::warn!(
                        ?domain,
                        ?version,
                        ?name,
                        "Missing or invalid whitelisted_programs field",
                    );
                    continue;
                }
            };

            // Convert Vec<String> to Vec<Pubkey>
            let whitelisted_programs: Vec<Pubkey> = match strings
                .into_iter()
                .map(|s| Pubkey::from_str(&s))
                .collect::<Result<Vec<_>, _>>()
            {
                Ok(pubkeys) => pubkeys,
                Err(err) => {
                    tracing::warn!(
                        ?err,
                        ?domain,
                        ?version,
                        ?name,
                        "Failed to parse pubkeys from whitelisted_programs",
                    );
                    continue;
                }
            };

            transaction_variation_fin = TransactionVariation::V0(VariationProgramWhitelist {
                name,
                whitelisted_programs,
            });
        } else {
            let instructions = match serde_json::from_value(transaction_variation.0) {
                Ok(tv) => tv,
                Err(err) => {
                    // log and skip this row instead of failing the whole query
                    tracing::warn!(
                        ?err,
                        ?domain,
                        ?version,
                        ?name,
                        "Skipping row with invalid transaction_variation",
                    );
                    continue;
                }
            };

            transaction_variation_fin =
                TransactionVariation::V1(VariationOrderedInstructionConstraints {
                    name,
                    instructions,
                    max_gas_spend: max_gas_spend.map(|v| v as u64).unwrap_or(0),
                });
        }

        let domain_ref = map.entry(domain_id).or_insert_with(|| Domain {
            domain,
            enable_session_management,
            enable_preflight_simulation,
            tx_variations: Vec::new(),
        });

        domain_ref.tx_variations.push(transaction_variation_fin);
    }

    Ok(Config {
        domains: map.into_values().collect(),
    })
}
