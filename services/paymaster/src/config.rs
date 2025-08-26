use anyhow::Result;
use config::File;
use serde::{Deserialize, Deserializer};
use solana_pubkey::Pubkey;
use std::str::FromStr;

fn deserialize_pubkey_vec<'de, D>(deserializer: D) -> Result<Vec<Pubkey>, D::Error>
where
    D: Deserializer<'de>,
{
    let strings: Vec<String> = Vec::deserialize(deserializer)?;
    strings
        .into_iter()
        .map(|s| Pubkey::from_str(&s).map_err(serde::de::Error::custom))
        .collect()
}

fn deserialize_sol_to_lamports<'de, D>(deserializer: D) -> Result<u64, D::Error>
where
    D: Deserializer<'de>,
{
    let sol_value: f64 = f64::deserialize(deserializer)?;

    // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
    let lamports = (sol_value * 1_000_000_000.0) as u64;

    Ok(lamports)
}

#[derive(Deserialize)]
pub struct Config {
    pub mnemonic_file: String,
    pub solana_url: String,
    pub listen_address: String,
    #[serde(deserialize_with = "deserialize_pubkey_vec")]
    pub program_whitelist: Vec<Pubkey>,
    // The maximum amount that the sponsor can spend on a transaction.
    // The value in the struct is expressed in lamports.
    // However, in the config file, specify a number of FOGO -- the deserializer will auto-convert to lamports.
    #[serde(deserialize_with = "deserialize_sol_to_lamports")]
    pub max_sponsor_spending: u64,
}

pub fn load_config(config_path: &str) -> Result<Config> {
    let config: Config = config::Config::builder()
        .add_source(File::with_name(config_path))
        .build()?
        .try_deserialize()?;
    Ok(config)
}
