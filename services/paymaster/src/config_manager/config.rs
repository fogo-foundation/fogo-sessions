use serde::{Deserialize, Deserializer};
use std::collections::{hash_map::Entry, HashMap};
use std::num::NonZeroU8;

use crate::constraint::config::TransactionVariation;
use crate::constraint::{insert_session_management_variations, ParsedTransactionVariation};

fn default_true() -> bool {
    true
}

pub fn default_one() -> NonZeroU8 {
    NonZeroU8::new(1).expect("non-zero u8 provided, should not panic")
}

#[derive(Deserialize)]
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

impl Domain {
    pub fn into_parsed_transaction_variations(
        tx_variations: HashMap<String, TransactionVariation>,
        enable_session_management: bool,
    ) -> anyhow::Result<HashMap<String, ParsedTransactionVariation>> {
        let mut tx_variations = tx_variations
            .into_iter()
            .map(|(name, variation)| Ok((name, variation.try_into()?)))
            .collect::<anyhow::Result<HashMap<_, _>>>()?;
        if enable_session_management {
            insert_session_management_variations(&mut tx_variations)?;
        }
        Ok(tx_variations)
    }
}

fn insert_variation(
    tx_variations: &mut HashMap<String, TransactionVariation>,
    variation: TransactionVariation,
) -> anyhow::Result<()> {
    let key = variation.name().to_string();
    match tx_variations.entry(key.clone()) {
        Entry::Vacant(entry) => {
            entry.insert(variation);
        }
        Entry::Occupied(_) => {
            return Err(anyhow::anyhow!(format!(
                "Duplicate transaction variation '{key}'"
            )))
        }
    }
    Ok(())
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
            insert_variation(&mut map, variation).map_err(serde::de::Error::custom)?;
            Ok(map)
        })
}

#[derive(Deserialize, Default)]
pub struct Config {
    pub domains: Vec<Domain>,
}
