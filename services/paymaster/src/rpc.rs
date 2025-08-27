use std::time::Duration;
use solana_client::{rpc_client::RpcClient, rpc_config::RpcSendTransactionConfig, rpc_request::RpcError};
use solana_commitment_config::CommitmentConfig;
use solana_transaction::versioned::VersionedTransaction;
use tokio::time::sleep;
use solana_rpc_client_api::client_error::Error;
use solana_signature::Signature;

const GET_STATUS_RETRIES: usize = usize::MAX;

// Copy of send_and_confirm_transaction from solana-rpc-client, but accepts a config
pub async fn send_and_confirm_transaction(rpc: &RpcClient, transaction: &VersionedTransaction, config: RpcSendTransactionConfig ) -> Result<Signature, Error> {
    let recent_blockhash = transaction.message.recent_blockhash();
    let signature = rpc
                .send_transaction_with_config(transaction, config)?;

            for status_retry in 0..GET_STATUS_RETRIES {
                match rpc.get_signature_status(&signature)? {
                    Some(Ok(_)) => return Ok(signature),
                    Some(Err(e)) => return Err(e.into()),
                    None => {
                        if !rpc
                            .is_blockhash_valid(&recent_blockhash, CommitmentConfig::processed())
                            ?
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
            Err(RpcError::ForUser(
                "unable to confirm transaction. \
                 This can happen in situations such as transaction expiration \
                 and insufficient fee-payer funds"
                    .to_string(),
            )
            .into())
        }

