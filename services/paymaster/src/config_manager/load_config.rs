use crate::api::{self, DomainState};
use crate::cli::NetworkEnvironment;
use crate::config_manager::config::Config;
use crate::db;
use anyhow::Result;
use arc_swap::ArcSwap;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::interval;
#[allow(dead_code, reason = "TODO: This module is unused until we bring back the DB")]
pub async fn load_db_config(network_environment: NetworkEnvironment) -> Result<Config> {
    let config = db::config::load_config(network_environment.into()).await?;
    // config.assign_defaults(); TODO: we need to load ntt_quoter from db
    Ok(config)
}

#[allow(dead_code, reason = "TODO: This module is unused until we bring back the DB")]
/// Spawn a background task to refresh the config every 10 seconds.
pub fn spawn_config_refresher(
    network_environment: NetworkEnvironment,
    mnemonic: String,
    domains: Arc<ArcSwap<HashMap<String, DomainState>>>,
    db_refresh_interval_seconds: u64,
) {
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(db_refresh_interval_seconds));
        // First tick fires immediately, we can skip it if we don't want a duplicate load.
        ticker.tick().await;

        loop {
            ticker.tick().await;
            match load_db_config(network_environment)
                .await
                .and_then(|new_config| api::get_domain_state_map(new_config.domains, &mnemonic))
            {
                Ok(new_domains) => {
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
