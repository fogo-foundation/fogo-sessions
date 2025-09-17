use axum_prometheus::metrics;

pub const TRANSACTION_VALIDATION_COUNT: &str = "paymaster_transaction_validation_total";
pub fn obs_validation(domain: String, variation: String, result_validation: String) {
    let labels = &[("domain", domain), ("variation", variation), ("result", result_validation)];
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

pub const GAS_SPEND_COUNT: &str = "paymaster_gas_spend_total";
pub const GAS_SPEND_HISTOGRAM: &str = "paymaster_gas_spend_hist";
pub fn obs_gas_spend(domain: String, variation: String, result_confirmation: Option<String>, lamports: u64) {
    let mut labels = vec![("domain", domain), ("variation", variation)];
    if let Some(result) = result_confirmation {
        labels.push(("result", result));
    }
    metrics::counter!(GAS_SPEND_COUNT, &labels).increment(lamports);
    metrics::histogram!(GAS_SPEND_HISTOGRAM, &labels).record(lamports as f64);
}
