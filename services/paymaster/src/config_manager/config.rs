use intent_transfer::bridge::processor::bridge_ntt_tokens::H160;
use serde::{Deserialize, Serialize};
use std::num::NonZeroU8;

use crate::constraint::TransactionVariation;

fn default_true() -> bool {
    true
}

fn default_one() -> NonZeroU8 {
    NonZeroU8::new(1).expect("1 is not 0")
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
