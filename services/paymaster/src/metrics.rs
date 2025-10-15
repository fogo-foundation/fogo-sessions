use axum_prometheus::metrics;

use crate::rpc::TransactionCostDetails;

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
pub fn obs_send(domain: String, variation: String, result_confirmation: String) {
    let labels = vec![
        ("domain", domain),
        ("variation", variation),
        ("result", result_confirmation),
    ];
    metrics::counter!(TRANSACTION_SEND_COUNT, &labels).increment(1);
}

pub const GAS_SPEND_HISTOGRAM: &str = "paymaster_gas_spend_lamports";
pub const TRANSFER_SPEND_HISTOGRAM: &str = "paymaster_transfer_spend_lamports";
pub const TOTAL_SPEND_HISTOGRAM: &str = "paymaster_total_spend_lamports";

pub const TRANSACTION_COST_BUCKETS: &[f64] = &[
    10_000.0,
    20_000.0,
    50_000.0,
    100_000.0,
    200_000.0,
    1_000_000.0,
    10_000_000.0,
    100_000_000.0,
    1_000_000_000.0,
];

/// Records actual transaction costs fetched from RPC after confirmation.
/// This includes the actual fee charged and the balance change (which includes rent and transfers).
pub fn obs_actual_transaction_costs(
    domain: String,
    variation: String,
    result_confirmation: String,
    cost_details: TransactionCostDetails,
) {
    let labels = vec![
        ("domain", domain),
        ("variation", variation),
        ("result", result_confirmation),
    ];

    metrics::histogram!(GAS_SPEND_HISTOGRAM, &labels).record(cost_details.fee as f64);

    if let Some(balance_change) = cost_details.balance_change {
        // Record total balance change (we negate to express greater than 0 spend as positive)
        metrics::histogram!(TOTAL_SPEND_HISTOGRAM, &labels).record(-balance_change as f64);

        if let Ok(fee_i64) = i64::try_from(cost_details.fee) {
            // Record nongas spend (balance_change includes fee, so subtract it)
            // Negative balance_change means balance decreased (spent)
            // transfer_spend = -(balance_change + fee) = -balance_change - fee
            let transfer_spend = (-balance_change).saturating_sub(fee_i64);
            metrics::histogram!(TRANSFER_SPEND_HISTOGRAM, &labels).record(transfer_spend as f64);
        } else {
            tracing::warn!("Fee value too large to fit in i64, skipping transfer spend metric");
        }
    } else {
        tracing::warn!(
            "No balance change information available, skipping transfer and total spend metrics"
        );
    }
}
