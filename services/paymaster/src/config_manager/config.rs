use serde::Deserialize;

use crate::constraint::TransactionVariation;

fn default_true() -> bool {
    true
}

#[derive(Deserialize, serde::Serialize, Debug)]
pub struct Domain {
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

#[derive(Deserialize, serde::Serialize, Debug)]
pub struct Config {
    pub domains: Vec<Domain>,
}
