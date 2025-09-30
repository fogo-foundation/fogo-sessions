use axum::{http::StatusCode, response::{ErrorResponse, IntoResponse, Response}, Json};
use solana_client::{rpc_client::RpcClient, rpc_config::RpcSendTransactionConfig};
use solana_commitment_config::CommitmentConfig;
use solana_hash::Hash;
use solana_rpc_client_api::client_error::Error;
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_error::TransactionError;
use std::time::Duration;
use tokio::time::sleep;

const GET_STATUS_RETRIES: usize = usize::MAX;

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

impl IntoResponse for ConfirmationResult {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
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
    transaction: &VersionedTransaction,
    config: RpcSendTransactionConfig,
) -> Result<ConfirmationResult, ErrorResponse> {
    let recent_blockhash = transaction.message.recent_blockhash();
    let signature = match rpc.send_transaction_with_config(transaction, config) {
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

    confirm_transaction(rpc, &signature, recent_blockhash).await
}

#[tracing::instrument(
    skip_all,
    fields(tx_hash = %signature)
)]
pub async fn confirm_transaction(
    rpc: &RpcClient,
    signature: &Signature,
    recent_blockhash: &Hash,
) -> Result<ConfirmationResult, ErrorResponse> {
    for status_retry in 0..GET_STATUS_RETRIES {
        match rpc
            .get_signature_status(signature)
            .map_err(to_error_response)?
        {
            Some(Ok(_)) => {
                return Ok(ConfirmationResult::Success {
                    signature: signature.to_string(),
                })
            }
            Some(Err(e)) => {
                return Ok(ConfirmationResult::Failed {
                    signature: signature.to_string(),
                    error: e,
                })
            }
            None => {
                if !rpc
                    .is_blockhash_valid(recent_blockhash, CommitmentConfig::processed())
                    .map_err(to_error_response)?
                {
                    break;
                } else if status_retry < GET_STATUS_RETRIES {
                    // Retry twice a second
                    sleep(Duration::from_millis(500)).await;
                    continue;
                }
            }
        }
    }
    Err((StatusCode::GATEWAY_TIMEOUT, "Unable to confirm transaction").into())
}
