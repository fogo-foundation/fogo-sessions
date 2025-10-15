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
    // loop through the domains and compare the tx_variations, we need to find the corresponding domain in the other config
    if config1.domains.len() != config2.domains.len() {
        return false;
    }
    for domain1 in &config1.domains {
        for domain2 in &config2.domains {
            if domain1.domain == domain2.domain {
                // compare the tx_variations
                if domain1.tx_variations.len() != domain2.tx_variations.len() {
                    return false;
                }
                // sort the variations
                let mut domain1_variations = domain1.tx_variations.clone();
                domain1_variations.sort_by_key(|v| v.name().to_string());
                let mut domain2_variations = domain2.tx_variations.clone();
                domain2_variations.sort_by_key(|v| v.name().to_string());
                // convert variations to json
                let json1 = serde_json::to_string(&domain1_variations).unwrap();
                let json2 = serde_json::to_string(&domain2_variations).unwrap();
                if json1 != json2 {
                    println!("json1: {}\n\n\njson2: {}", json1, json2);
                    return false;
                }
            }
        }
    }

    return true;
}

pub async fn load_config(config_path: &str) -> Result<Config> {
    let mut file_config = load_file_config(config_path).unwrap();

    db::seed_from_config::seed_from_config(&file_config).await?;

    let mut db_config = load_db_config().await?;

    assign_config_defaults(&mut db_config);
    assign_config_defaults(&mut file_config);

    if !compare_configs(&db_config, &file_config) {
        // throw error
        anyhow::bail!("Error parsing config.");
    }

    Ok(db_config)
}
