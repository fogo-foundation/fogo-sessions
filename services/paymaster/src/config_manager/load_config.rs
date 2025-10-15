use crate::{config_manager::config::Config, constraint::TransactionVariation};
use std::env;

use crate::db;
use anyhow::Result;
use config::File;

pub const DEFAULT_TEMPLATE_MAX_GAS_SPEND: u64 = 100_000;

fn load_file_config(config_path: &str) -> Result<Config> {
    let config: Config = config::Config::builder()
        .add_source(File::with_name(config_path))
        .build()?
        .try_deserialize()?;

    Ok(config)
}

async fn load_db_config() -> Result<Config> {
    let config = db::load_config::load_config().await?;
    Ok(config)
}

fn assign_config_defaults(config: &mut Config) {
    config.mnemonic_file =
        env::var("MNEMONIC_FILE").unwrap_or_else(|_| config.mnemonic_file.clone());
    config.solana_url = env::var("SOLANA_URL").unwrap_or_else(|_| config.solana_url.clone());
    config.listen_address =
        env::var("LISTEN_ADDRESS").unwrap_or_else(|_| config.listen_address.clone());
    for domain in &mut config.domains {
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
            .push(TransactionVariation::intent_transfer_variation(
                DEFAULT_TEMPLATE_MAX_GAS_SPEND,
            ));
    }
}

pub fn compare_configs(config1: &Config, config2: &Config) -> bool {
    // check if these objects are the same
    // we can convert them to json and compare the json strings
    let json1 = serde_json::to_string(config1).unwrap();
    let json2 = serde_json::to_string(config2).unwrap();
    if json1 != json2 {
        return false;
    }
    return true;
}

pub async fn load_config(config_path: &str) -> Result<Config> {
    let file_config = load_file_config(config_path).unwrap();

    db::seed_from_config::seed_from_config(&file_config).await?;

    let mut db_config = load_db_config().await?;

    assign_config_defaults(&mut db_config);

    if !compare_configs(&db_config, &file_config) {
        // throw error
        anyhow::bail!("Error parsing config.");
    }

    Ok(db_config)
}
