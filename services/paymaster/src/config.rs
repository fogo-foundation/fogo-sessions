use anyhow::Result;
use config::File;
use serde::Deserialize;

use crate::constraint::TransactionVariation;

#[derive(Deserialize)]
pub struct Domain {
    pub domain: String,

    /// Whether to enable paymaster sponsoring session management (start/revoke) transactions.
    pub enable_session_management: bool,

    /// Whether to enable preflight simulation for transactions before submitting them.
    pub enable_preflight_simulation: bool,

    /// The list of transaction types that the paymaster should sponsor.
    pub tx_variations: Vec<TransactionVariation>,
}

#[derive(Deserialize)]
pub struct Config {
    pub mnemonic_file: String,
    pub solana_url: String,
    pub listen_address: String,
    pub domains: Vec<Domain>,
}

pub fn load_config(config_path: &str) -> Result<Config> {
    let config: Config = config::Config::builder()
        .add_source(File::with_name(config_path))
        .build()?
        .try_deserialize()?;
    Ok(config)
}
