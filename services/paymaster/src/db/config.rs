use crate::config_manager::config::{default_one, Config, Domain};
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

#[derive(FromRow)]
struct DomainConfig {
    id: Uuid,
    domain: String,
    enable_session_management: bool,
    enable_preflight_simulation: bool,
}

#[derive(FromRow)]
struct Variation {
    domain_config_id: Uuid,
    version: String,
    name: String,
    max_gas_spend: Option<i64>,
    transaction_variation: Json<Value>,
}

fn handle_transaction_variation_v0(
    transaction_variation: Json<Value>,
    name: String,
) -> Result<TransactionVariation, anyhow::Error> {
    // Extract the whitelisted_programs array as Vec<String>
    let strings: Vec<String> = match transaction_variation.0 {
        JsonValue::Array(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect(),
        _ => {
            return Err(anyhow::anyhow!(
                "Missing or invalid whitelisted_programs field"
            ));
        }
    };

    let whitelisted_programs: Vec<Pubkey> = strings
        .into_iter()
        .map(|s| Pubkey::from_str(&s))
        .collect::<Result<Vec<_>, _>>()?;

    Ok(TransactionVariation::V0(VariationProgramWhitelist {
        name,
        whitelisted_programs,
    }))
}

fn handle_transaction_variation_v1(
    transaction_variation: Json<Value>,
    name: String,
    max_gas_spend: u64,
) -> Result<TransactionVariation, anyhow::Error> {
    let instructions = serde_json::from_value(transaction_variation.0)?;
    Ok(TransactionVariation::V1(
        VariationOrderedInstructionConstraints {
            name,
            instructions,
            max_gas_spend,
            paymaster_fee_lamports: None,
        },
    ))
}

pub async fn load_config() -> Result<Config, anyhow::Error> {
    let domain_rows = sqlx::query_as!(
        DomainConfig,
        r#"
        SELECT
          id,
          domain,
          enable_session_management,
          enable_preflight_simulation
        FROM domain_config
        "#,
    )
    .fetch_all(pool::pool())
    .await?;

    let variation_rows = sqlx::query_as!(
        Variation,
        r#"
        SELECT
          domain_config_id,
          version::text AS "version!",
          name,
          max_gas_spend,
          transaction_variation AS "transaction_variation: Json<Value>"
        FROM variation
        "#,
    )
    .fetch_all(pool::pool())
    .await?;

    let mut domain_map: HashMap<Uuid, Domain> = HashMap::new();

    for DomainConfig {
        id,
        domain,
        enable_session_management,
        enable_preflight_simulation,
    } in domain_rows
    {
        domain_map.insert(
            id,
            Domain {
                domain: domain.clone(),
                enable_session_management,
                enable_preflight_simulation,
                number_of_signers: default_one(), // TODO: Get number of signers from database
                tx_variations: HashMap::new(),
            },
        );
    }

    for Variation {
        domain_config_id,
        version,
        name,
        max_gas_spend,
        transaction_variation,
    } in variation_rows
    {
        if let Some(domain_ref) = domain_map.get_mut(&domain_config_id) {
            let transaction_variation_fin = match version.as_str() {
                "v0" => handle_transaction_variation_v0(transaction_variation, name)?,
                "v1" => {
                    // v1 *requires* max_gas_spend
                    let max = match max_gas_spend {
                        Some(v) => v,
                        None => {
                            tracing::warn!(
                                domain_id = ?domain_config_id,
                                ?version,
                                ?name,
                                "v1 row missing max_gas_spend, skipping",
                            );
                            continue;
                        }
                    };

                    handle_transaction_variation_v1(
                        transaction_variation,
                        name,
                        u64::try_from(max)
                            .map_err(|e| anyhow::anyhow!("Invalid max gas spend: {e}"))?,
                    )?
                }
                _ => {
                    tracing::warn!(
                        domain_id = ?domain_config_id,
                        ?version,
                        ?name,
                        "Skipping row with invalid transaction_variation",
                    );
                    continue;
                }
            };
            domain_ref.tx_variations.insert(
                transaction_variation_fin.name().to_string(),
                transaction_variation_fin,
            );
        } else {
            tracing::warn!(
                domain_id = ?domain_config_id,
                "Variation references non-existent domain_config",
            );
        }
    }

    Ok(Config {
        domains: domain_map.into_values().collect(),
    })
}
