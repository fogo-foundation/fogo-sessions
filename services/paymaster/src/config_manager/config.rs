use intent_transfer::bridge::processor::bridge_ntt_tokens::H160;
use serde::{Deserialize, Deserializer, Serialize};
use std::collections::HashMap;

use crate::constraint::TransactionVariation;

fn default_true() -> bool {
    true
}

#[derive(Serialize)]
pub struct Domain {
    /// The domain that the paymaster should sponsor.
    pub domain: String,

    /// Whether to enable paymaster sponsoring session management (start/revoke) transactions.
    #[serde(default = "default_true")]
    pub enable_session_management: bool,

    /// Whether to enable preflight simulation for transactions before submitting them.
    #[serde(default = "default_true")]
    pub enable_preflight_simulation: bool,

    /// The list of transaction types that the paymaster should sponsor.
    pub tx_variations: HashMap<String, TransactionVariation>,
}

#[derive(Deserialize)]
struct DomainHelper {
    domain: String,
    #[serde(default = "default_true")]
    enable_session_management: bool,
    #[serde(default = "default_true")]
    enable_preflight_simulation: bool,
    tx_variations: Vec<TransactionVariation>,
}

impl<'de> Deserialize<'de> for Domain {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error> where D: Deserializer<'de> {
        let helper = DomainHelper::deserialize(deserializer)?;
        let tx_variations_map = helper.tx_variations.into_iter().try_fold(
            HashMap::new(),
            |mut map, variation| {
                let key = variation.name().to_string();
                match map.entry(key.clone()) {
                    std::collections::hash_map::Entry::Vacant(entry) => {
                        entry.insert(variation);
                    }
                    std::collections::hash_map::Entry::Occupied(_) => {
                        return Err(serde::de::Error::custom(format!(
                            "Duplicate transaction variation '{}' for domain '{}'",
                            key,
                            helper.domain
                        )));
                    }
                }
                Ok(map)
            },
        )?;

        Ok(Domain {
            domain: helper.domain,
            enable_session_management: helper.enable_session_management,
            enable_preflight_simulation: helper.enable_preflight_simulation,
            tx_variations: tx_variations_map,
        })
    }
}

#[derive(Deserialize, serde::Serialize, Default)]
pub struct Config {
    pub domains: Vec<Domain>,
}
pub const DEFAULT_TEMPLATE_MAX_GAS_SPEND: u64 = 100_000;

impl Config {
    /// Populate default tx variations for each domain.
    /// Call this after loading from file/DB to ensure required variations exist.
    pub fn assign_defaults(&mut self, ntt_quoter: H160) -> anyhow::Result<()> {
        for domain in &mut self.domains {
            if domain.enable_session_management {
                let variation_establishment = TransactionVariation::session_establishment_variation(
                    DEFAULT_TEMPLATE_MAX_GAS_SPEND,
                );
                let key_establishment = variation_establishment.name().to_string();
                match domain.tx_variations.entry(key_establishment.clone()) {
                    std::collections::hash_map::Entry::Vacant(entry) => {
                        entry.insert(variation_establishment);
                    }
                    std::collections::hash_map::Entry::Occupied(_) => {
                        Err(anyhow::anyhow!(
                            "Default variation '{key_establishment}' conflicts with user-defined variation in domain '{}'",
                            domain.domain
                        ))?
                    }
                }

                let variation_revocation = TransactionVariation::session_revocation_variation(
                    DEFAULT_TEMPLATE_MAX_GAS_SPEND,
                );
                let key_revocation = variation_revocation.name().to_string();
                match domain.tx_variations.entry(key_revocation.clone()) {
                    std::collections::hash_map::Entry::Vacant(entry) => {
                        entry.insert(variation_revocation);
                    }
                    std::collections::hash_map::Entry::Occupied(_) => {
                        Err(anyhow::anyhow!(
                            "Default variation '{key_revocation}' conflicts with user-defined variation in domain '{}'",
                            domain.domain
                        ))?
                    }
                }
            }
            let variation_send_tokens =
                TransactionVariation::intent_transfer_send_tokens_variation(
                    DEFAULT_TEMPLATE_MAX_GAS_SPEND,
                );
            let key_send_tokens = variation_send_tokens.name().to_string();
            match domain.tx_variations.entry(key_send_tokens.clone()) {
                std::collections::hash_map::Entry::Vacant(entry) => {
                    entry.insert(variation_send_tokens);
                }
                std::collections::hash_map::Entry::Occupied(_) => {
                    Err(anyhow::anyhow!(
                        "Default variation '{key_send_tokens}' conflicts with user-defined variation in domain '{}'",
                        domain.domain
                    ))?
                }
            }

            let variation_bridge_ntt =
                TransactionVariation::intent_transfer_bridge_ntt_variation(
                    ntt_quoter,
                    DEFAULT_TEMPLATE_MAX_GAS_SPEND,
                );
            let key_bridge_ntt = variation_bridge_ntt.name().to_string();
            match domain.tx_variations.entry(key_bridge_ntt.clone()) {
                std::collections::hash_map::Entry::Vacant(entry) => {
                    entry.insert(variation_bridge_ntt);
                }
                std::collections::hash_map::Entry::Occupied(_) => {
                    Err(anyhow::anyhow!(
                        "Default variation '{key_bridge_ntt}' conflicts with user-defined variation in domain '{}'",
                        domain.domain
                    ))?
                }
            }
        }

        Ok(())
    }
}
