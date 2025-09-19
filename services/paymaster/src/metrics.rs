use axum_prometheus::metrics;
use num_traits::cast::ToPrimitive;

pub const TRANSACTION_VALIDATION_COUNT: &str = "paymaster_transaction_validation_total";
pub fn obs_validation(domain: String, variation: String, result_validation: String) {
    let labels = &[
        ("domain", domain),
        ("variation", variation),
        ("result", result_validation),
    ];
    metrics::counter!(TRANSACTION_VALIDATION_COUNT, labels).increment(1);
}

pub const TRANSACTION_SEND_COUNT: &str = "paymaster_transaction_send_total";
pub fn obs_send(domain: String, variation: String, result_confirmation: Option<String>) {
    let mut labels = vec![("domain", domain), ("variation", variation)];
    if let Some(result) = result_confirmation {
        labels.push(("result", result));
    }
    metrics::counter!(TRANSACTION_SEND_COUNT, &labels).increment(1);
}

pub const GAS_SPEND_HISTOGRAM: &str = "paymaster_gas_spend_hist";
pub const GAS_SPEND_BUCKETS: &[f64] = &[
    10_000.0,
    20_000.0,
    50_000.0,
    100_000.0,
    200_000.0,
    1_000_000.0,
    10_000_000.0,
    100_000_000.0,
];
pub fn obs_gas_spend(
    domain: String,
    variation: String,
    result_confirmation: Option<String>,
    lamports: u64,
) {
    let mut labels = vec![("domain", domain), ("variation", variation)];
    if let Some(result) = result_confirmation {
        labels.push(("result", result));
    }
    metrics::histogram!(GAS_SPEND_HISTOGRAM, &labels).record(
        // Default to f64::MAX if conversion fails. This only happens if lamports is extremely large.
        lamports.to_f64().unwrap_or(f64::MAX),
    );
}
