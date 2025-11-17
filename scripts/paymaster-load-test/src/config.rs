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
    /// Percentage of valid session creation transactions (0.0 to 1.0)
    pub valid_session_creation_rate: f64,

    /// Percentage of valid memo transactions (0.0 to 1.0)
    pub valid_memo_rate: f64,

    /// Percentage of transactions with invalid signatures
    pub invalid_signature_rate: f64,

    /// Percentage of transactions not meeting constraints
    pub invalid_constraint_rate: f64,

    /// Percentage of transactions with invalid fee payer
    pub invalid_fee_payer_rate: f64,

    /// Percentage of transactions exceeding gas limits
    pub invalid_gas_rate: f64,
}

impl ValidityDistribution {
    pub fn valid_rate(&self) -> f64 {
        self.valid_session_creation_rate + self.valid_memo_rate
    }
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

    /// Paymaster IP override, useful is the paymaster is behind a load balancer
    pub paymaster_ip_override: Option<String>,
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
    pub fn new(
        duration_secs: u64,
        request_rps: u64,
        validity_distribution: ValidityDistribution,
        external: ExternalTarget,
    ) -> Result<Self> {
        anyhow::ensure!(duration_secs > 0, "Duration must be positive");
        anyhow::ensure!(request_rps > 0, "Request RPS must be positive");
        anyhow::ensure!(
            validity_distribution.valid_session_creation_rate >= 0.0 && validity_distribution.valid_session_creation_rate <= 1.0,
            "Valid session creation rate must be between 0.0 and 1.0"
        );

        anyhow::ensure!(
            validity_distribution.valid_memo_rate >= 0.0 && validity_distribution.valid_memo_rate <= 1.0,
            "Valid memo rate must be between 0.0 and 1.0"
        );

        let total_invalid = validity_distribution.invalid_signature_rate
            + validity_distribution.invalid_constraint_rate
            + validity_distribution.invalid_fee_payer_rate
            + validity_distribution.invalid_gas_rate;

        let total = validity_distribution.valid_session_creation_rate + validity_distribution.valid_memo_rate + total_invalid;
        anyhow::ensure!(
            (total - 1.0).abs() < 0.01,
            "Sum of validity rates must equal 1.0 (currently: {total:.2})"
        );

        anyhow::ensure!(
            !external.paymaster_endpoint.is_empty(),
            "Paymaster endpoint cannot be empty"
        );
        anyhow::ensure!(!external.rpc_url.is_empty(), "RPC URL cannot be empty");
        anyhow::ensure!(!external.domain.is_empty(), "Domain cannot be empty");

        Ok(Self {
            duration_secs,
            request_rps,
            validity_distribution,
            external,
        })
    }
}

impl ValidityDistribution {
    /// Sample a validity type based on the configured distribution
    pub fn sample(&self) -> ValidityType {
        let rand_val: f64 = rand::random();
        let mut cumulative = 0.0;

        cumulative += self.valid_session_creation_rate;
        if rand_val < cumulative {
            return ValidityType::ValidSessionCreation;
        }

        cumulative += self.valid_memo_rate;
        if rand_val < cumulative {
            return ValidityType::ValidMemo;
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
    ValidSessionCreation,
    ValidMemo,
    InvalidSignature,
    InvalidConstraint,
    InvalidFeePayer,
    InvalidGas,
}

impl ValidityType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ValidityType::ValidSessionCreation => "valid_session_creation",
            ValidityType::ValidMemo => "valid_memo",
            ValidityType::InvalidSignature => "invalid_signature",
            ValidityType::InvalidConstraint => "invalid_constraint",
            ValidityType::InvalidFeePayer => "invalid_fee_payer",
            ValidityType::InvalidGas => "invalid_gas",
        }
    }
}
