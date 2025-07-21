

use anyhow::Result;
use serde::{Deserialize, Deserializer};
use config::File;
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

#[derive(Deserialize)]
pub struct Config {
    pub keypair_path: String,
    pub solana_url: String,
    pub listen_address: String,
    #[serde(deserialize_with = "deserialize_pubkey_vec")]
    pub program_whitelist: Vec<Pubkey>,
}

pub fn load_config(config_path: &str) -> Result<Config> {
    let config: Config = config::Config::builder()
        .add_source(File::with_name(config_path))
        .build()?
        .try_deserialize()?;
    Ok(config)
}