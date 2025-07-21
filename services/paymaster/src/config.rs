

use anyhow::Result;
use serde::Deserialize;
use config::File;

#[derive(Deserialize)]
pub struct Config {
    pub keypair_path: String,
    pub solana_url: String,
    pub listen_address: String,
    pub program_whitelist: Vec<String>,
}

pub fn load_config(config_path: &str) -> Result<Config> {
    let config: Config = config::Config::builder()
    .add_source(File::with_name(config_path)).build()?.try_deserialize()?;
    Ok(config)
}