use axum::{http::StatusCode, response::ErrorResponse};
use futures::stream::StreamExt;
use solana_client::{
    nonblocking::rpc_client::RpcClient,
    rpc_config::{RpcSendTransactionConfig, RpcSignatureSubscribeConfig, RpcTransactionConfig},
};
use solana_commitment_config::CommitmentConfig;
use solana_pubsub_client::nonblocking::pubsub_client::PubsubClient;
use solana_rpc_client_api::client_error::Error;
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_error::TransactionError;
use solana_transaction_status_client_types::UiTransactionEncoding;
use std::time::Duration;
use tokio::time::timeout;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum ConfirmationResult {
    #[serde(rename = "success")]
    Success { signature: String },
    #[serde(rename = "failed")]
    Failed {
        signature: String,
        error: TransactionError,
    },
}

impl ConfirmationResult {
    pub fn status_string(&self) -> String {
        match self {
            ConfirmationResult::Success { .. } => "success".to_string(),
            ConfirmationResult::Failed { .. } => "failed".to_string(),
        }
    }
}

fn to_error_response(err: Error) -> ErrorResponse {
    (
        StatusCode::BAD_GATEWAY,
        format!("Failed SVM RPC call: {err}"),
    )
        .into()
}

// Inspired by send_and_confirm_transaction from solana-rpc-client, but accepts a config
#[tracing::instrument(
    skip_all,
    fields(tx_hash = %transaction.signatures[0])
)]
pub async fn send_and_confirm_transaction(
    rpc: &RpcClient,
    pubsub: &PubsubClient,
    transaction: &VersionedTransaction,
    config: RpcSendTransactionConfig,
) -> Result<ConfirmationResult, ErrorResponse> {
    let signature = match rpc.send_transaction_with_config(transaction, config).await {
        Ok(sig) => sig,
        Err(err) => {
            if let Some(error) = err.get_transaction_error() {
                return Ok(ConfirmationResult::Failed {
                    signature: transaction.signatures[0].to_string(),
                    error,
                });
            }
            return Err(to_error_response(err));
        }
    };

    confirm_transaction(pubsub, &signature, Some(rpc.commitment())).await
}

pub const CONFIRMATION_TIMEOUT: Duration = Duration::from_secs(60);

#[tracing::instrument(
    skip_all,
    fields(tx_hash = %signature)
)]
pub async fn confirm_transaction(
    rpc_sub: &PubsubClient,
    signature: &Signature,
    commitment: Option<CommitmentConfig>,
) -> Result<ConfirmationResult, ErrorResponse> {
    let (mut stream, unsubscribe) = rpc_sub
        .signature_subscribe(
            signature,
            Some(RpcSignatureSubscribeConfig {
                commitment,
                ..RpcSignatureSubscribeConfig::default()
            }),
        )
        .await
        .map_err(|e| {
            (
                StatusCode::BAD_GATEWAY,
                format!("Failed to subscribe to signature: {e}"),
            )
        })?;

    // two levels of results here:
    // 1. timeout error (outer)
    // 2. RpcError from the stream failing (inner)
    // innermost contains actual transaction error if transaction failed or success info if it succeeded
    let result = timeout(CONFIRMATION_TIMEOUT, async {
        while let Some(response) = stream.next().await {
            if let solana_client::rpc_response::RpcSignatureResult::ProcessedSignature(
                processed_signature_result,
            ) = response.value
            {
                if let Some(err) = processed_signature_result.err {
                    return Ok(ConfirmationResult::Failed {
                        signature: signature.to_string(),
                        error: err,
                    });
                } else {
                    return Ok(ConfirmationResult::Success {
                        signature: signature.to_string(),
                    });
                }
            }
        }

        Err((
            StatusCode::BAD_GATEWAY,
            "Signature subscription stream ended unexpectedly",
        )
            .into())
    })
    .await;

    unsubscribe().await;

    result
        .map_err(|_| (StatusCode::GATEWAY_TIMEOUT, "Unable to confirm transaction").into())
        .and_then(|r| r)
}

#[derive(Debug, Clone)]
pub struct TransactionCostDetails {
    pub fee: u64,
    pub balance_change: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub max_tries: u32,
    pub backoff_ms: u64,
}

/// Fetches transaction details from RPC and extracts cost information (fee and balance changes) for the tx fee payer.
/// If metadata is not available from RPC, falls back to computing gas spend from the transaction.
/// If retry_config is provided, retries the RPC call with backoff on failure.
#[tracing::instrument(skip_all, fields(tx_hash = %signature))]
pub async fn fetch_transaction_cost_details(
    rpc: &RpcClient,
    signature: &Signature,
    transaction: &VersionedTransaction,
    retry_config: Option<RetryConfig>,
) -> Result<TransactionCostDetails, ErrorResponse> {
    let config = RpcTransactionConfig {
        encoding: Some(UiTransactionEncoding::Json),
        max_supported_transaction_version: Some(0),
        // this method does not support any commitment below confirmed
        commitment: Some(CommitmentConfig::confirmed()),
    };

    let retry_cfg = retry_config.unwrap_or(RetryConfig {
        max_tries: 1,
        backoff_ms: 0,
    });

    let mut last_error = None;

    for attempt in 0..retry_cfg.max_tries {
        if attempt > 0 {
            tokio::time::sleep(Duration::from_millis(retry_cfg.backoff_ms)).await;
        }

        match rpc.get_transaction_with_config(signature, config).await {
            Ok(tx_response) => {
                let (fee, balance_change) = tx_response
                    .transaction
                    .meta
                    .map(|meta| {
                        let balance_change = meta
                            .pre_balances
                            .get(0)
                            .and_then(|&before| meta.post_balances.get(0).map(|&after| (before, after)))
                            .and_then(|(before, after)| {
                                i64::try_from(after)
                                    .ok()
                                    .zip(i64::try_from(before).ok())
                                    .map(|(after_i64, before_i64)| after_i64.saturating_sub(before_i64))
                            });
                        (meta.fee, balance_change)
                    })
                    .unwrap_or_else(|| {
                        let fee = crate::constraint::compute_gas_spent(transaction)
                            .unwrap_or(0);
                        (fee, None)
                    });

                return Ok(TransactionCostDetails {
                    fee,
                    balance_change,
                });
            }
            Err(e) => {
                last_error = Some(e);
            }
        }
    }

    Err((
        StatusCode::BAD_GATEWAY,
        format!("Failed to fetch transaction from RPC after {} attempts: {:?}", retry_cfg.max_tries, last_error),
    ).into())
}
