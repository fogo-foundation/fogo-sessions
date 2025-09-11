use anyhow::Result;
use config::File;
use serde::Deserialize;

use crate::constraint::TransactionVariation;
use crate::serde::deserialize_sol_to_lamports;

#[derive(Deserialize)]
pub struct Domain {
    pub domain: String,

    /// Whether to enable paymaster sponsoring session management (start/revoke) transactions.
    pub enable_session_management: bool,

    /// The list of transaction types that the paymaster should sponsor.
    pub tx_variations: Vec<TransactionVariation>,
}

#[derive(Deserialize)]
pub struct Config {
    pub mnemonic_file: String,
    pub solana_url: String,
    pub listen_address: String,
    // The maximum amount that the sponsor can spend on a transaction.
    // The value in the struct is expressed in lamports.
    // However, in the config file, specify a number of FOGO -- the deserializer will auto-convert to lamports.
    #[serde(deserialize_with = "deserialize_sol_to_lamports")]
    pub max_sponsor_spending: u64,
    pub domains: Vec<Domain>,
}

pub fn load_config(config_path: &str) -> Result<Config> {
    let config: Config = config::Config::builder()
        .add_source(File::with_name(config_path))
        .build()?
        .try_deserialize()?;
    Ok(config)
}
