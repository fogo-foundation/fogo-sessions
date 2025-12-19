use serde::{Deserialize, Deserializer, Serialize};
use serde_with::{serde_as, DisplayFromStr};
use solana_pubkey::Pubkey;
use std::collections::{hash_map::Entry, HashMap};
use std::num::NonZeroU8;

use crate::constraint::TransactionVariation;

fn default_true() -> bool {
    true
}

pub fn default_one() -> NonZeroU8 {
    NonZeroU8::new(1).expect("non-zero u8 provided, should not panic")
}

#[derive(Deserialize, Serialize)]
pub struct Domain {
    /// The domain that the paymaster should sponsor.
    pub domain: String,

    /// Whether to enable paymaster sponsoring session management (start/revoke) transactions.
    #[serde(default = "default_true")]
    pub enable_session_management: bool,

    /// Whether to enable preflight simulation for transactions before submitting them.
    #[serde(default = "default_true")]
    pub enable_preflight_simulation: bool,

    #[serde(default = "default_one")]
    pub number_of_signers: NonZeroU8,

    /// The list of transaction types that the paymaster should sponsor.
    #[serde(deserialize_with = "deserialize_transaction_variations")]
    pub tx_variations: HashMap<String, TransactionVariation>,
}

fn insert_variation(
    tx_variations: &mut HashMap<String, TransactionVariation>,
    variation: TransactionVariation,
    templated: bool,
) -> anyhow::Result<()> {
    let key = variation.name().to_string();
    match tx_variations.entry(key.clone()) {
        Entry::Vacant(entry) => {
            entry.insert(variation);
        }
        Entry::Occupied(_) => {
            let error_msg = if templated {
                format!(
                    "Template transaction variation '{key}' conflicts with user-defined variation"
                )
            } else {
                format!("Duplicate transaction variation '{key}'")
            };
            Err(anyhow::anyhow!(error_msg))?
        }
    }
    Ok(())
}

fn deserialize_paymaster_fee_coefficients<'de, D>(
    deserializer: D,
) -> Result<HashMap<Pubkey, u64>, D::Error>
where
    D: Deserializer<'de>,
{
    #[serde_as]
    #[derive(Deserialize)]
    struct FeeCoefficient {
        #[serde_as(as = "DisplayFromStr")]
        mint: Pubkey,
        coefficient: u64,
    }

    let coefficients: Vec<FeeCoefficient> = Vec::deserialize(deserializer)?;
    coefficients.into_iter().try_fold(
        HashMap::new(),
        |mut map, FeeCoefficient { mint, coefficient }| {
            if map.insert(mint, coefficient).is_some() {
                return Err(serde::de::Error::custom(format!(
                    "Duplicate mint {mint} in paymaster fee coefficients"
                )));
            }
            Ok(map)
        },
    )
}

fn deserialize_transaction_variations<'de, D>(
    deserializer: D,
) -> Result<HashMap<String, TransactionVariation>, D::Error>
where
    D: Deserializer<'de>,
{
    let variations: Vec<TransactionVariation> = Vec::deserialize(deserializer)?;
    variations
        .into_iter()
        .try_fold(HashMap::new(), |mut map, variation| {
            insert_variation(&mut map, variation, false).map_err(serde::de::Error::custom)?;
            Ok(map)
        })
}

#[derive(Deserialize, Serialize, Default)]
pub struct Config {
    #[serde(deserialize_with = "deserialize_paymaster_fee_coefficients")]
    pub paymaster_fee_coefficients: HashMap<Pubkey, u64>,
    pub domains: Vec<Domain>,
}
pub const DEFAULT_TEMPLATE_MAX_GAS_SPEND: u64 = 15_000;

impl Config {
    /// Populate default tx variations for each domain.
    /// Call this after loading from file/DB to ensure required variations exist.
    pub fn assign_defaults(&mut self) -> anyhow::Result<()> {
        for domain in &mut self.domains {
            if domain.enable_session_management {
                insert_variation(
                    &mut domain.tx_variations,
                    TransactionVariation::session_establishment_variation(
                        DEFAULT_TEMPLATE_MAX_GAS_SPEND,
                    ),
                    true,
                )?;

                insert_variation(
                    &mut domain.tx_variations,
                    TransactionVariation::session_revocation_variation(
                        DEFAULT_TEMPLATE_MAX_GAS_SPEND,
                    ),
                    true,
                )?;
            }
        }
        Ok(())
    }
}
