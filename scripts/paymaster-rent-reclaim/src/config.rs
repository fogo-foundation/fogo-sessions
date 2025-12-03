use anyhow::{Context, Result};
use serde::Deserialize;
use std::{num::NonZeroUsize, path::Path};

#[derive(Debug, Clone)]
pub struct RuntimeConfig {
    /// Target request rate per second
    pub request_rps: u64,

    pub external: ExternalTarget,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FileConfig {
    /// External target configuration
    pub external: ExternalTarget,
}

fn default_one() -> NonZeroUsize {
    NonZeroUsize::new(1).expect("non-zero u8 provided, should not panic")
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExternalTarget {
    /// Paymaster endpoint URL
    pub paymaster_endpoint: String,

    /// RPC endpoint URL
    pub rpc_url: String,

    /// Domain to use for requests
    pub domain: String,

    /// Paymaster IP override, useful is the paymaster is behind a load balancer
    pub paymaster_ip_override: Option<String>,

    /// Number of sponsor keys to request from the paymaster
    #[serde(default = "default_one")]
    pub number_of_sponsors: NonZeroUsize,
}

impl FileConfig {
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        let contents = std::fs::read_to_string(path)
            .with_context(|| format!("Failed to read config file at: {}", path.display()))?;
        let config: FileConfig = toml::from_str(&contents)
            .with_context(|| format!("Failed to parse config file at: {}", path.display()))?;
        Ok(config)
    }
}

impl RuntimeConfig {
    pub fn new(request_rps: u64, external: ExternalTarget) -> Result<Self> {
        anyhow::ensure!(request_rps > 0, "Request RPS must be positive");

        anyhow::ensure!(
            !external.paymaster_endpoint.is_empty(),
            "Paymaster endpoint cannot be empty"
        );
        anyhow::ensure!(!external.rpc_url.is_empty(), "RPC URL cannot be empty");
        anyhow::ensure!(!external.domain.is_empty(), "Domain cannot be empty");

        Ok(Self {
            request_rps,
            external,
        })
    }
}
