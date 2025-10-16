use axum::{http::StatusCode, response::ErrorResponse};
use dashmap::DashMap;
use futures::stream::StreamExt;
use solana_address_lookup_table_interface::state::AddressLookupTable;
use solana_client::{
    nonblocking::rpc_client::RpcClient,
    rpc_config::{RpcSendTransactionConfig, RpcSignatureSubscribeConfig},
};
use solana_commitment_config::CommitmentConfig;
use solana_program::instruction::CompiledInstruction;
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

impl ChainIndex {
    /// Find the pubkey for the account at index `account_index_within_instruction` within the `instruction` at `instruction_index` in the given `transaction`.
    pub async fn resolve_instruction_account_pubkey(&self, transaction: &VersionedTransaction, instruction: &CompiledInstruction, instruction_index: usize, account_index_within_instruction: usize) -> Result<Pubkey, (StatusCode, String)> {
        let account_index_within_transaction = usize::from(*instruction
            .accounts
            .get(usize::from(account_index_within_instruction))
            .ok_or_else(|| {
                (
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Transaction instruction {instruction_index} missing account at index {account_index_within_instruction}",
                    ),
                )
            })?);
        if let Some(pubkey) = transaction.message.static_account_keys().get(account_index_within_transaction) {
                return Ok(*pubkey);
            } else if let Some(lookup_tables) = transaction.message.address_table_lookups() {
            let lookup_accounts: Vec<(Pubkey, u8)> = lookup_tables
                .iter()
                .flat_map(|x| {
                    x.writable_indexes
                        .clone()
                        .into_iter()
                        .map(|y| (x.account_key, y))
                })
                .chain(lookup_tables.iter().flat_map(|x| {
                    x.readonly_indexes
                        .clone()
                        .into_iter()
                        .map(|y| (x.account_key, y))
                }))
                .collect();
            let account_index_within_lookup_tables = account_index_within_transaction - transaction.message.static_account_keys().len();
            return self
                .find_and_query_lookup_table(lookup_accounts, account_index_within_lookup_tables)
                .await
        } else {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction instruction {instruction_index} account index {account_index_within_transaction} out of bounds",
                ),
            ));
        };
    }

    /// Finds the lookup table and the index within that table that correspond to the given relative account position within the list of lookup invoked accounts.
    async fn find_and_query_lookup_table(
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
    async fn query_lookup_table_with_retry(
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
    fn query_lookup_table(&self, table: &Pubkey, index: usize) -> Option<Pubkey> {
        self.lookup_table_cache
            .get(table)
            .and_then(|entry| entry.get(index).copied())
    }

    // Updates the lookup table entry in the dashmap based on pulling from RPC. Returns the updated table data.
    async fn update_lookup_table(
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
}

/// Sends a transaction and waits for confirmation via WebSocket subscription.
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
async fn confirm_transaction(
    pubsub: &PubsubClient,
    signature: &Signature,
    commitment: Option<CommitmentConfig>,
) -> Result<ConfirmationResult, ErrorResponse> {
    let (mut stream, unsubscribe) = pubsub
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
