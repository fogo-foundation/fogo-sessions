use axum::{http::StatusCode, response::ErrorResponse};
use dashmap::DashMap;
use futures::stream::StreamExt;
use solana_address_lookup_table_interface::state::AddressLookupTable;
use solana_client::{nonblocking::rpc_client::RpcClient, rpc_config::{RpcSendTransactionConfig, RpcSignatureSubscribeConfig}};
use solana_commitment_config::CommitmentConfig;
use solana_pubkey::Pubkey;
use solana_pubsub_client::nonblocking::pubsub_client::PubsubClient;
use solana_rpc_client_api::client_error::Error;
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_error::TransactionError;
use std::time::Duration;
use tokio::time::timeout;

pub struct ChainIndex {
    pub rpc: RpcClient,
    pub rpc_sub: Option<PubsubClient>,
    pub lookup_table_cache: DashMap<Pubkey, Vec<Pubkey>>,
}

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

pub const CONFIRMATION_TIMEOUT: Duration = Duration::from_secs(60);

impl ChainIndex {
    /// Finds the lookup table and the index within that table that correspond to the given relative account position within the list of lookup invoked accounts.
    pub async fn find_and_query_lookup_table(
        &self,
        lookup_accounts: Vec<(Pubkey, u8)>,
        account_position_lookups: usize,
    ) -> Result<Pubkey, (StatusCode, String)> {
        let (table_to_query, index_to_query) =
            lookup_accounts.get(account_position_lookups).ok_or_else(|| {
                (
                    StatusCode::BAD_REQUEST,
                    format!("Account position {account_position_lookups} out of bounds for lookup table invoked accounts"),
                )
            })?;
        self.query_lookup_table_with_retry(table_to_query, usize::from(*index_to_query))
            .await
    }

    /// Queries the lookup table for the pubkey at the given index.
    /// If the table is not cached or the index is out of bounds, it fetches and updates the table from the RPC before requerying.
    pub async fn query_lookup_table_with_retry(
        &self,
        table: &Pubkey,
        index: usize,
    ) -> Result<Pubkey, (StatusCode, String)> {
        if let Some(pubkey) = self.query_lookup_table(table, index) {
            return Ok(pubkey);
        }

        let addresses = self.update_lookup_table(table).await?;
        // get the key from the returned addresses instead of re-querying and re-locking the map
        addresses.get(index).copied().ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                format!("Lookup table {table} does not contain index {index}"),
            )
        })
    }

    /// Queries the lookup table for the pubkey at the given index.
    /// Returns None if the table is not cached or the index is out of bounds.
    pub fn query_lookup_table(&self, table: &Pubkey, index: usize) -> Option<Pubkey> {
        self.lookup_table_cache
            .get(table)
            .and_then(|entry| entry.get(index).copied())
    }

    // Updates the lookup table entry in the dashmap based on pulling from RPC. Returns the updated table data.
    pub async fn update_lookup_table(
        &self,
        table: &Pubkey,
    ) -> Result<Vec<Pubkey>, (StatusCode, String)> {
        let table_data = self.rpc.get_account(table).await.map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to fetch lookup table account {table} from RPC: {err}"),
            )
        })?;
        let table_data_deserialized =
            AddressLookupTable::deserialize(&table_data.data).map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to deserialize lookup table account {table}: {e}"),
                )
            })?;

        self.lookup_table_cache
            .insert(*table, table_data_deserialized.addresses.to_vec());

        Ok(table_data_deserialized.addresses.to_vec())
    }

    /// Sends a transaction and waits for confirmation via WebSocket subscription.
    /// Returns an error if WebSocket client is not configured.
    #[tracing::instrument(
        skip_all,
        fields(tx_hash = %transaction.signatures[0])
    )]
    pub async fn send_and_confirm_transaction(
        &self,
        transaction: &VersionedTransaction,
        config: RpcSendTransactionConfig,
    ) -> Result<ConfirmationResult, ErrorResponse> {
        let pubsub = self.rpc_sub.as_ref().ok_or_else(|| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "WebSocket client required for transaction confirmation".to_string(),
            )
        })?;

        let signature = match self.rpc.send_transaction_with_config(transaction, config).await {
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

        self.confirm_transaction(pubsub, &signature, Some(self.rpc.commitment()))
            .await
    }

    #[tracing::instrument(
        skip_all,
        fields(tx_hash = %signature)
    )]
    async fn confirm_transaction(
        &self,
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
}
