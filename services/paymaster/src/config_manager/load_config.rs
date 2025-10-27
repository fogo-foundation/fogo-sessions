use crate::api::{self, DomainState};
use crate::config_manager::config::Config;
use crate::db;
use anyhow::Result;
use arc_swap::ArcSwap;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::interval;

async fn load_db_config() -> Result<Config> {
    let mut config = db::config::load_config().await?;
    config.assign_defaults();
    Ok(config)
}

/// Spawn a background task to refresh the config every 10 seconds.
pub fn spawn_config_refresher(
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
            match load_db_config().await {
                Ok(new_config) => {
                    // Recompute the derived state
                    let new_domains = api::get_domain_state_map(new_config.domains, &mnemonic);

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
