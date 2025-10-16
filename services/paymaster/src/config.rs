use anyhow::Result;
use config::File;
use serde::Deserialize;

use crate::constraint::tolls::Tolls;
use crate::constraint::TransactionVariation;

fn default_true() -> bool {
    true
}

#[derive(Deserialize)]
pub struct Domain {
    pub domain: String,

    /// Whether to enable paymaster sponsoring session management (start/revoke) transactions.
    #[serde(default = "default_true")]
    pub enable_session_management: bool,

    /// Whether to enable preflight simulation for transactions before submitting them.
    #[serde(default = "default_true")]
    pub enable_preflight_simulation: bool,

    /// The list of transaction types that the paymaster should sponsor.
    pub tx_variations: Vec<TransactionVariation>,

    #[serde(default)]
    pub tolls: Option<Tolls>,
}

#[derive(Deserialize)]
pub struct Config {
    pub domains: Vec<Domain>,
    #[serde(default)]
    pub tolls: Tolls,
}

pub const DEFAULT_TEMPLATE_MAX_GAS_SPEND: u64 = 100_000;

pub fn load_config(config_path: &str) -> Result<Config> {
    let mut config: Config = config::Config::builder()
        .add_source(File::with_name(config_path))
        .build()?
        .try_deserialize()?;

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

    Ok(config)
}
