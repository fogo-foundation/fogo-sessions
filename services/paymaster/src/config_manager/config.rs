use intent_transfer::bridge::processor::bridge_ntt_tokens::H160;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::constraint::TransactionVariation;

fn default_true() -> bool {
    true
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

    /// The list of transaction types that the paymaster should sponsor.
    pub tx_variations: Vec<TransactionVariation>,
}

#[derive(Deserialize, serde::Serialize, Default)]
pub struct Config {
    pub domains: Vec<Domain>,
}
pub const DEFAULT_TEMPLATE_MAX_GAS_SPEND: u64 = 100_000;

impl Config {
    /// Populate default tx variations for each domain.
    /// Call this after loading from file/DB to ensure required variations exist.
    pub fn assign_defaults(&mut self, ntt_quoter: H160) {
        for domain in &mut self.domains {
            if domain.enable_session_management {
                domain
                    .tx_variations
                    .push(TransactionVariation::session_establishment_variation(
                        DEFAULT_TEMPLATE_MAX_GAS_SPEND,
                    ));
                domain
                    .tx_variations
                    .push(TransactionVariation::session_revocation_variation(
                        DEFAULT_TEMPLATE_MAX_GAS_SPEND,
                    ));
            }
            domain
                .tx_variations
                .push(TransactionVariation::intent_transfer_send_tokens_variation(
                    DEFAULT_TEMPLATE_MAX_GAS_SPEND,
                ));
            domain
                .tx_variations
                .push(TransactionVariation::intent_transfer_bridge_ntt_variation(
                    ntt_quoter,
                    DEFAULT_TEMPLATE_MAX_GAS_SPEND,
                ))
        }
    }
}

#[derive(Deserialize, Serialize)]
pub struct ParsedDomain {
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

#[derive(Deserialize, Serialize)]
pub struct ParsedConfig {
    pub domains: Vec<ParsedDomain>,
}

impl TryFrom<Config> for ParsedConfig {
    type Error = anyhow::Error;

    fn try_from(value: Config) -> Result<Self, Self::Error> {
        let parsed_domains: Vec<ParsedDomain> = value.domains.into_iter().map(|domain| {
            let tx_variations_map = domain.tx_variations.into_iter().try_fold(HashMap::new(), |mut map, variation| {
                let key = variation.name().to_string();

                match map.entry(key.clone()) {
                    std::collections::hash_map::Entry::Vacant(entry) => {
                        entry.insert(variation);
                        Ok(map)
                    }
                    std::collections::hash_map::Entry::Occupied(_) => {
                        return Err(anyhow::anyhow!(
                            "Duplicate transaction variation '{}' for domain '{}'",
                            variation.name(),
                            domain.domain
                        ));
                    }
                }
            })?;

            let parsed_domain = ParsedDomain {
                domain: domain.domain,
                enable_session_management: domain.enable_session_management,
                enable_preflight_simulation: domain.enable_preflight_simulation,
                tx_variations: tx_variations_map,
            };

            Ok(parsed_domain)
        }).collect::<anyhow::Result<_>>()?;

        Ok(ParsedConfig {
            domains: parsed_domains,
        })
    }
}
