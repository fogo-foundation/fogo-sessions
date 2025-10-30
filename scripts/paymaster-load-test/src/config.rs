use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct RuntimeConfig {
    /// Test duration in seconds
    pub duration_secs: u64,

    /// Target request rate per second
    pub request_rps: u64,

    pub validity_distribution: ValidityDistribution,

    pub external: ExternalTarget,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ValidityDistribution {
    /// Percentage of valid transactions (0.0 to 1.0)
    pub valid_rate: f64,

    /// Percentage of transactions with invalid signatures
    pub invalid_signature_rate: f64,

    /// Percentage of transactions not meeting constraints
    pub invalid_constraint_rate: f64,

    /// Percentage of transactions with invalid fee payer
    pub invalid_fee_payer_rate: f64,

    /// Percentage of transactions exceeding gas limits
    pub invalid_gas_rate: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FileConfig {
    /// Validity distribution configuration
    pub validity: ValidityDistribution,

    /// External target configuration
    pub external: ExternalTarget,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExternalTarget {
    /// Paymaster endpoint URL
    pub paymaster_endpoint: String,

    /// RPC endpoint URL
    pub rpc_url: String,

    /// Domain to use for requests
    pub domain: String,

    /// Chain ID for session establishment
    pub chain_id: String,
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
    pub fn validate(&self) -> Result<()> {
        anyhow::ensure!(
            self.duration_secs > 0,
            "Test duration must be greater than 0"
        );
        anyhow::ensure!(
            self.request_rps > 0,
            "Request rate must be greater than 0"
        );

        anyhow::ensure!(
            self.validity_distribution.valid_rate >= 0.0 && self.validity_distribution.valid_rate <= 1.0,
            "Valid rate must be between 0.0 and 1.0"
        );

        let total_invalid = self.validity_distribution.invalid_signature_rate
            + self.validity_distribution.invalid_constraint_rate
            + self.validity_distribution.invalid_fee_payer_rate
            + self.validity_distribution.invalid_gas_rate;

        let total = self.validity_distribution.valid_rate + total_invalid;
        anyhow::ensure!(
            (total - 1.0).abs() < 0.01,
            "Sum of validity rates must equal 1.0 (currently: {:.2})",
            total
        );

        anyhow::ensure!(
            !self.external.paymaster_endpoint.is_empty(),
            "Paymaster endpoint cannot be empty"
        );
        anyhow::ensure!(
            !self.external.rpc_url.is_empty(),
            "RPC URL cannot be empty"
        );
        anyhow::ensure!(
            !self.external.domain.is_empty(),
            "Domain cannot be empty"
        );
        anyhow::ensure!(
            !self.external.chain_id.is_empty(),
            "Chain id cannot be empty"
        );

        Ok(())
    }
}

impl ValidityDistribution {
    /// Sample a validity type based on the configured distribution
    pub fn sample(&self) -> ValidityType {
        let rand_val: f64 = rand::random();
        let mut cumulative = 0.0;

        cumulative += self.valid_rate;
        if rand_val < cumulative {
            return ValidityType::Valid;
        }

        cumulative += self.invalid_signature_rate;
        if rand_val < cumulative {
            return ValidityType::InvalidSignature;
        }

        cumulative += self.invalid_constraint_rate;
        if rand_val < cumulative {
            return ValidityType::InvalidConstraint;
        }

        cumulative += self.invalid_fee_payer_rate;
        if rand_val < cumulative {
            return ValidityType::InvalidFeePayer;
        }

        ValidityType::InvalidGas
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ValidityType {
    Valid,
    InvalidSignature,
    InvalidConstraint,
    InvalidFeePayer,
    InvalidGas,
}

impl ValidityType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ValidityType::Valid => "valid",
            ValidityType::InvalidSignature => "invalid_signature",
            ValidityType::InvalidConstraint => "invalid_constraint",
            ValidityType::InvalidFeePayer => "invalid_fee_payer",
            ValidityType::InvalidGas => "invalid_gas",
        }
    }
}
