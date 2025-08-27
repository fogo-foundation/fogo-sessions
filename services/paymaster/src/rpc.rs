use std::time::Duration;
use axum::{http::StatusCode, response::ErrorResponse};
use solana_client::{rpc_client::RpcClient, rpc_config::RpcSendTransactionConfig};
use solana_commitment_config::CommitmentConfig;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_error::TransactionError;
use tokio::time::sleep;
use solana_rpc_client_api::client_error::Error;

const GET_STATUS_RETRIES: usize = usize::MAX;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type")]
pub enum ConfirmationResult {
    Success { signature: String },
    Failed { signature: String, error: TransactionError },
}

fn to_error_response(err: Error) -> ErrorResponse {
    (StatusCode::BAD_GATEWAY, format!("Failed SVM RPC call: {err}")).into()
}

// Inspired by send_and_confirm_transaction from solana-rpc-client, but accepts a config
pub async fn send_and_confirm_transaction(rpc: &RpcClient, transaction: &VersionedTransaction, config: RpcSendTransactionConfig ) -> Result<ConfirmationResult, ErrorResponse> {
    let recent_blockhash = transaction.message.recent_blockhash();
    let signature = rpc
                .send_transaction_with_config(transaction, config).map_err(to_error_response)?;

            for status_retry in 0..GET_STATUS_RETRIES {
                match rpc.get_signature_status(&signature).map_err(to_error_response)? {
                    Some(Ok(_)) => return Ok(ConfirmationResult::Success { signature: signature.to_string() }),
                    Some(Err(e)) => return Ok(ConfirmationResult::Failed { signature: signature.to_string(), error: e }),
                    None => {
                        if !rpc
                            .is_blockhash_valid(&recent_blockhash, CommitmentConfig::processed())
                            .map_err(to_error_response)?
                        {
                            break;
                        } else if status_retry < GET_STATUS_RETRIES
                        {
                            // Retry twice a second
                            sleep(Duration::from_millis(500)).await;
                            continue;
                        }
                    }
                }
            }
            Err((StatusCode::GATEWAY_TIMEOUT, "Unable to confirm transaction").into())
        }

