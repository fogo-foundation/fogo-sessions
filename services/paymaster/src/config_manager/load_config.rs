use arc_swap::ArcSwap;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use crate::api::{self, DomainState};
use crate::config_manager::config::Config;

use crate::db;
use anyhow::Result;
use config::File;
use tokio::time::interval;

/// Load the config from the file.
pub fn load_file_config(config_path: &str) -> Result<Config> {
    let config: Config = config::Config::builder()
        .add_source(File::with_name(config_path))
        .build()?
        .try_deserialize()?;
    // note we DO NOT want to assign defaults here because this will be used to seed the database and there's no point adding the txs from eg. enable_session_management
    // config.assign_defaults();
    Ok(config)
}

/// Load the config from the database.
async fn load_db_config() -> Result<Config> {
    let mut config = db::config::load_config().await?;
    config.assign_defaults();
    Ok(config)
}

/// Spawn a background task to refresh the config every 10 seconds.
pub fn spawn_config_refresher(
    mnemonic: String,
    domains: Arc<ArcSwap<HashMap<String, DomainState>>>,
) {
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(10));
        // First tick fires immediately, we can skip it if we don't want a duplicate load.
        ticker.tick().await;

        loop {
            ticker.tick().await;
            // note that `load_config` also reads from the toml file but that shouldn't be an issue
            match load_db_config().await {
                Ok(new_config) => {
                    // Recompute the derived state
                    let new_domains = api::get_domain_state_map(new_config.domains, &mnemonic);

                    // Atomically swap the entire HashMap
                    domains.store(Arc::new(new_domains));

                    tracing::info!("Config/domains refreshed");
                }
                Err(e) => {
                    tracing::error!("Failed to reload the config: {}", e);
                }
            }
        }
    });
}
