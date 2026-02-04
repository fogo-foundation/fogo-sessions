use crate::config_manager::config::{default_one, Config, Domain};
use crate::constraint::config::InstructionConstraint;
use crate::constraint::MintSwapRate;
use crate::constraint::{
    config::TransactionVariation, config::VariationOrderedInstructionConstraints,
    VariationProgramWhitelist,
};
use serde_json::Value;
use solana_pubkey::Pubkey;
use sqlx::{
    types::{Json, JsonValue},
    FromRow, Type,
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
    swap_into_fogo: Option<Json<Value>>,
    paymaster_fee_lamports: Option<i64>,
}

#[derive(Clone, Debug, PartialEq, Type, Eq, PartialOrd, Ord)]
#[sqlx(type_name = "network_environment")]
pub enum NetworkEnvironment {
    #[sqlx(rename = "mainnet")]
    Mainnet,
    #[sqlx(rename = "testnet")]
    Testnet,
    #[sqlx(rename = "localnet")]
    Localnet,
}

fn handle_transaction_variation_v0(
    transaction_variation: Json<Value>,
    name: String,
) -> anyhow::Result<TransactionVariation> {
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
    paymaster_fee_lamports: Option<i64>,
    swap_into_fogo: Option<Json<Value>>,
) -> anyhow::Result<TransactionVariation> {
    let instructions: Vec<InstructionConstraint> = serde_json::from_value(transaction_variation.0)?;

    let parsed_swap_into_fogo: Vec<MintSwapRate> = match swap_into_fogo {
        Some(v) => serde_json::from_value(v.0)?,
        None => vec![],
    };

    let parsed_paymaster_fee_lamports = match paymaster_fee_lamports {
        Some(v) => Some(
            u64::try_from(v).map_err(|e| anyhow::anyhow!("Invalid paymaster fee lamports: {e}"))?,
        ),
        None => None,
    };

    Ok(TransactionVariation::V1(
        VariationOrderedInstructionConstraints {
            name,
            instructions,
            max_gas_spend,
            paymaster_fee_lamports: parsed_paymaster_fee_lamports,
            swap_into_fogo: parsed_swap_into_fogo,
        },
    ))
}

pub async fn load_config(network_environment: NetworkEnvironment) -> Result<Config, anyhow::Error> {
    let domain_rows = sqlx::query_as!(
        DomainConfig,
        r#"
        SELECT
          id,
          domain,
          enable_session_management,
          enable_preflight_simulation
        FROM domain_config
        WHERE network_environment = $1
        "#,
        network_environment as _,
    )
    .fetch_all(pool::pool())
    .await?;

    let variation_rows = sqlx::query_as!(
        Variation,
        r#"
        SELECT
          v.domain_config_id,
          v.version::text AS "version!",
          v.name,
          v.max_gas_spend,
          v.transaction_variation AS "transaction_variation: Json<Value>",
          v.swap_into_fogo AS "swap_into_fogo?: Json<Value>",
          v.paymaster_fee_lamports AS "paymaster_fee_lamports?: i64"
        FROM variation v
        INNER JOIN domain_config dc ON v.domain_config_id = dc.id
        WHERE dc.network_environment = $1
        "#,
        network_environment as _,
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
        swap_into_fogo,
        paymaster_fee_lamports,
    } in variation_rows
    {
        if let Some(domain_ref) = domain_map.get_mut(&domain_config_id) {
            let result: anyhow::Result<TransactionVariation> = {
                match version.as_str() {
                    "v0" => handle_transaction_variation_v0(transaction_variation, name.clone()),
                    "v1" => {
                        // v1 *requires* max_gas_spend
                        max_gas_spend
                            .ok_or_else(|| anyhow::anyhow!("v1 row missing max_gas_spend"))
                            .and_then(|max| {
                                u64::try_from(max)
                                    .map_err(|e| anyhow::anyhow!("Invalid max gas spend: {e}"))
                                    .and_then(|max_u64| {
                                        handle_transaction_variation_v1(
                                            transaction_variation,
                                            name.clone(),
                                            max_u64,
                                            paymaster_fee_lamports,
                                            swap_into_fogo,
                                        )
                                    })
                            })
                    }
                    _ => Err(anyhow::anyhow!("Invalid transaction_variation version")),
                }
            };

            let transaction_variation_fin = match result {
                Ok(v) => v,
                Err(e) => {
                    tracing::warn!(
                        domain_id = ?domain_config_id,
                        ?version,
                        ?name,
                        error = ?e,
                        "Skipping row with invalid transaction_variation"
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
