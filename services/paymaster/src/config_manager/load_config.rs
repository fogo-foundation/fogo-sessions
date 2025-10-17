use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use crate::api::{self, DomainState};
use crate::{config_manager::config::Config, constraint::TransactionVariation};

use crate::db;
use anyhow::Result;
use config::File;
use tokio::sync::RwLock;
use tokio::time::interval;

pub const DEFAULT_TEMPLATE_MAX_GAS_SPEND: u64 = 100_000;

/// Load the config from the file.
fn load_file_config(config_path: &str) -> Result<Config> {
    let config: Config = config::Config::builder()
        .add_source(File::with_name(config_path))
        .build()?
        .try_deserialize()?;
    Ok(config)
}

/// Load the config from the database.
async fn load_db_config() -> Result<Config> {
    let config = db::config::load_config().await?;
    Ok(config)
}

fn assign_config_defaults(config: &mut Config) {
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

/// Compare the two configs to make sure they are the same.
#[allow(dead_code)]
fn compare_configs(config1: &Config, config2: &Config) -> bool {
    if config1.domains.len() != config2.domains.len() {
        return false;
    }
    for domain1 in &config1.domains {
        for domain2 in &config2.domains {
            // loop through the domains and compare the tx_variations, we need to find the corresponding domain in the other config
            if domain1.domain == domain2.domain {
                if domain1.enable_session_management != domain2.enable_session_management {
                    return false;
                }
                if domain1.enable_preflight_simulation != domain2.enable_preflight_simulation {
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
                    return false;
                }
            }
        }
    }

    true
}

pub async fn load_config(config_path: &str) -> Result<Config> {
    let mut file_config = load_file_config(config_path)?;

    db::config::seed_from_config(&file_config).await?;

    let mut db_config = load_db_config().await?;

    assign_config_defaults(&mut db_config);
    assign_config_defaults(&mut file_config);

    // this was used when testing to make sure we have the same config structure from the database as the one from the toml file
    // if !compare_configs(&db_config, &file_config) {
    //     // throw error
    //     anyhow::bail!("Error parsing config.");
    // }

    Ok(db_config)
}

/// Spawn a background task to refresh the config every 10 seconds.
pub fn spawn_config_refresher(
    config_path: String,
    mnemonic: String,
    domains: &Arc<RwLock<HashMap<String, DomainState>>>,
) {
    // ----- background refresher -----
    let domains = Arc::clone(domains);
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(10));
        // First tick fires immediately, we can skip it if we don't want a duplicate load.
        ticker.tick().await;

        loop {
            ticker.tick().await;
            // note that `load_config` also reads from the toml file but that shouldn't be an issue
            match load_config(&config_path).await {
                Ok(new_config) => {
                    // Recompute the derived state
                    let new_domains = api::get_domain_state_map(new_config.domains, &mnemonic);

                    // Atomically swap under a write lock
                    {
                        let mut guard = domains.write().await;
                        *guard = new_domains;
                    }

                    tracing::info!("Config/domains refreshed");
                }
                Err(e) => {
                    tracing::error!("Failed to read mnemonic file during config update: {}", e);
                }
            }
        }
    });
}
