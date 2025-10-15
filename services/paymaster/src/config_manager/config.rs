use serde::Deserialize;

use crate::constraint::TransactionVariation;

fn default_true() -> bool {
    true
}

#[derive(Deserialize, serde::Serialize)]
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

#[derive(Deserialize, serde::Serialize)]
pub struct Config {
    pub mnemonic_file: String,
    pub solana_url: String,
    pub listen_address: String,
    pub domains: Vec<Domain>,
}
