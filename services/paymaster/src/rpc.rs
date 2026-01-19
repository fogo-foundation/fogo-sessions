use axum::{http::StatusCode, response::ErrorResponse};
use base64::prelude::*;
use dashmap::DashMap;
use futures::stream::StreamExt;
use serde_json::json;
use solana_address_lookup_table_interface::state::AddressLookupTable;
use solana_client::{
    nonblocking::rpc_client::RpcClient,
    rpc_config::{RpcSendTransactionConfig, RpcSignatureSubscribeConfig, RpcTransactionConfig},
};
use solana_commitment_config::CommitmentConfig;
use solana_message::VersionedMessage;
use solana_pubkey::Pubkey;
use solana_rpc_client_api::client_error::{Error, ErrorKind};
use solana_rpc_client_api::request::RpcRequest;
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_error::TransactionError;
use solana_transaction_status_client_types::UiTransactionEncoding;
use std::time::Duration;
use tokio::time::timeout;

use crate::{
    api::{ConfirmationResult, PubsubClientWithReconnect},
    constraint::transaction::InstructionWithIndex,
};

pub struct ChainIndex {
    pub rpc: RpcClient,
    pub lookup_table_cache: DashMap<Pubkey, Vec<Pubkey>>,
}

pub enum ConfirmationResultInternal {
    /// Transaction was confirmed and succeeded on chain
    Success { signature: Signature },

    /// Transaction was confirmed but failed on chain
    Failed {
        signature: Signature,
        error: TransactionError,
    },

    /// Transaction was not confirmed due to preflight failure
    UnconfirmedPreflightFailure {
        signature: Signature,
        error: TransactionError,
    },
}

impl ConfirmationResultInternal {
    pub fn status_string(&self) -> String {
        match self {
            ConfirmationResultInternal::Success { .. } => "success".to_string(),
            ConfirmationResultInternal::Failed { .. } => "failed".to_string(),
            ConfirmationResultInternal::UnconfirmedPreflightFailure { .. } => {
                "unconfirmed_preflight_failure".to_string()
            }
        }
    }
}

impl From<ConfirmationResultInternal> for ConfirmationResult {
    fn from(internal: ConfirmationResultInternal) -> Self {
        match internal {
            ConfirmationResultInternal::Success { signature } => {
                ConfirmationResult::Success { signature }
            }
            ConfirmationResultInternal::Failed { signature, error } => {
                ConfirmationResult::Failed { signature, error }
            }
            ConfirmationResultInternal::UnconfirmedPreflightFailure { signature, error } => {
                ConfirmationResult::Failed { signature, error }
            }
        }
    }
}

/// A wrapper around `VersionedTransaction` that guarantees the transaction has been signed by its fee payer (first signature slot).
pub struct SignedVersionedTransaction(VersionedTransaction);

impl SignedVersionedTransaction {
    /// Creates a new SignedVersionedTransaction by adding the signature to the transaction.
    /// Returns an error if the transaction has no signature slots.
    pub fn new(
        mut transaction: VersionedTransaction,
        signature: Signature,
    ) -> anyhow::Result<Self> {
        *transaction.signatures.get_mut(0).ok_or_else(|| {
            anyhow::anyhow!("Transaction must have at least one signature slot")
        })? = signature;
        Ok(Self(transaction))
    }

    /// Returns the fee-payer signature of the transaction.
    pub fn signature(&self) -> &Signature {
        self.0
            .signatures
            .get(0)
            .expect("SignedVersionedTransaction is guaranteed to have at least one signature slot")
    }
}

impl AsRef<VersionedTransaction> for SignedVersionedTransaction {
    fn as_ref(&self) -> &VersionedTransaction {
        &self.0
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
    /// Find the pubkey for the account at index `account_index_within_instruction` within the `instruction_with_index` in the given `transaction`.
    pub async fn resolve_instruction_account_pubkey(
        &self,
        message: &VersionedMessage,
        InstructionWithIndex {
            index: instruction_index,
            instruction,
        }: &InstructionWithIndex<'_>,
        account_index_within_instruction: usize,
    ) -> Result<Pubkey, (StatusCode, String)> {
        let account_index_within_transaction = usize::from(*instruction
            .accounts
            .get(account_index_within_instruction)
            .ok_or_else(|| {
                (
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Account index {account_index_within_instruction} out of bounds for instruction {instruction_index}",
                    ),
                )
            })?);
        if let Some(pubkey) = message
            .static_account_keys()
            .get(account_index_within_transaction)
        {
            Ok(*pubkey)
        } else if let Some(lookup_tables) = message.address_table_lookups() {
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
            let account_index_within_lookup_tables =
                account_index_within_transaction - message.static_account_keys().len();
            return self
                .find_and_query_lookup_table(lookup_accounts, account_index_within_lookup_tables)
                .await;
        } else {
            Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Account index {account_index_within_instruction} for instruction {instruction_index} expected to be in the address table lookup but the transaction does not reference any address table lookups",
                ),
            ))
        }
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
    fields(
        tx_hash = %transaction.signature(),
        result
    )
)]
pub async fn send_and_confirm_transaction(
    rpc: &RpcClient,
    pubsub: &PubsubClientWithReconnect,
    transaction: &SignedVersionedTransaction,
    config: RpcSendTransactionConfig,
) -> Result<ConfirmationResultInternal, ErrorResponse> {
    let signature = match rpc
        .send_transaction_with_config(transaction.as_ref(), config)
        .await
    {
        Ok(sig) => {
            tracing::Span::current().record("result", "sent");
            sig
        }
        Err(err) => {
            if let Some(error) = err.get_transaction_error() {
                tracing::Span::current().record("result", "preflight_failure");
                tracing::warn!(
                    "Transaction {} failed preflight: {error}",
                    transaction.signature()
                );
                return Ok(ConfirmationResultInternal::UnconfirmedPreflightFailure {
                    signature: *transaction.signature(),
                    error,
                });
            }
            tracing::Span::current().record("result", "send_failed");
            tracing::error!(
                "Failed to send transaction {}: {err}",
                transaction.signature()
            );
            return Err(to_error_response(err));
        }
    };

    confirm_transaction(pubsub, signature, Some(rpc.commitment())).await
}

/// Sends a transaction using the FTL service which handles both sending and confirmation.
/// The FTL service requires a "confirm" parameter set to true in the RPC config.
#[tracing::instrument(
    skip_all,
    fields(
        tx_hash = %transaction.signature(),
        result
    )
)]
pub async fn send_and_confirm_transaction_ftl(
    ftl_rpc: &RpcClient,
    transaction: &SignedVersionedTransaction,
    config: RpcSendTransactionConfig,
) -> Result<ConfirmationResultInternal, ErrorResponse> {
    let tx_bytes = bincode::serde::encode_to_vec(transaction.as_ref(), bincode::config::standard())
        .map_err(|e| {
            tracing::error!("Failed to serialize transaction: {e}");
            ErrorResponse::from((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to serialize transaction",
            ))
        })?;
    let tx_base64 = BASE64_STANDARD.encode(&tx_bytes);

    let mut config_value = serde_json::to_value(RpcSendTransactionConfig {
        encoding: Some(config.encoding.unwrap_or(UiTransactionEncoding::Base64)),
        preflight_commitment: Some(config.preflight_commitment.unwrap_or_default()),
        ..config
    })
    .map_err(|e| {
        tracing::error!("Failed to serialize config: {e}");
        ErrorResponse::from((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to serialize config",
        ))
    })?;

    // Add the "confirm" parameter to the config
    if let Some(obj) = config_value.as_object_mut() {
        obj.insert("confirm".to_string(), json!(true));
    }

    // Use the RPC client's send method to make the request
    let signature: String = match ftl_rpc
        .send(
            RpcRequest::SendTransaction,
            json!([tx_base64, config_value]),
        )
        .await
    {
        Ok(sig) => {
            tracing::Span::current().record("result", "sent");
            sig
        }
        Err(err) => {
            let preflight = matches!(&err.kind, &ErrorKind::RpcError(_));
            if let Some(error) = err.get_transaction_error() {
                if preflight {
                    tracing::Span::current().record("result", "preflight_failure");
                    tracing::warn!(
                        "Transaction {} failed preflight: {error}",
                        transaction.signature()
                    );
                    return Ok(ConfirmationResultInternal::UnconfirmedPreflightFailure {
                        signature: *transaction.signature(),
                        error,
                    });
                } else {
                    // confirmed failed
                    tracing::Span::current().record("result", "failed");
                    return Ok(ConfirmationResultInternal::Failed {
                        signature: *transaction.signature(),
                        error,
                    });
                }
            }

            tracing::Span::current().record("result", "send_failed");
            tracing::error!(
                "Failed to send transaction {}: {err}",
                transaction.signature()
            );
            return Err(to_error_response(err));
        }
    };

    let signature = signature.parse::<Signature>().map_err(|e| {
        tracing::Span::current().record("result", "send_failed");
        tracing::error!("Failed to parse signature from FTL response: {e}");
        ErrorResponse::from((
            StatusCode::BAD_GATEWAY,
            format!("Failed to parse signature: {e}"),
        ))
    })?;

    tracing::Span::current().record("result", "success");
    // Since FTL handles confirmation, we return success immediately
    Ok(ConfirmationResultInternal::Success { signature })
}

const CONFIRMATION_TIMEOUT: Duration = Duration::from_secs(60);

#[tracing::instrument(
    skip_all,
    fields(
        tx_hash = %signature,
        result
    )
)]
async fn confirm_transaction(
    pubsub: &PubsubClientWithReconnect,
    signature: Signature,
    commitment: Option<CommitmentConfig>,
) -> Result<ConfirmationResultInternal, ErrorResponse> {
    let signature_result = subscribe_and_wait_for_signature(pubsub, signature, commitment, true)
        .await
        .map_err(|(status, err_string)| {
            tracing::Span::current().record("result", "unconfirmed");
            (
                status,
                format!("Failed to confirm transaction {signature}: {err_string}"),
            )
        })?;

    if let Some(err) = signature_result.err {
        tracing::Span::current().record("result", "failed");
        return Ok(ConfirmationResultInternal::Failed {
            signature,
            error: err,
        });
    } else {
        tracing::Span::current().record("result", "success");
        return Ok(ConfirmationResultInternal::Success { signature });
    }
}

#[async_recursion::async_recursion]
async fn subscribe_and_wait_for_signature(
    pubsub: &PubsubClientWithReconnect,
    signature: Signature,
    commitment: Option<CommitmentConfig>,
    reconnect: bool,
) -> Result<solana_client::rpc_response::ProcessedSignatureResult, (StatusCode, String)> {
    let pubsub_client = pubsub.client.load();
    let subscribe_result = pubsub_client
        .signature_subscribe(
            &signature,
            Some(RpcSignatureSubscribeConfig {
                commitment,
                ..RpcSignatureSubscribeConfig::default()
            }),
        )
        .await;

    let (mut stream, unsubscribe) = match subscribe_result {
        Ok(sub) => sub,
        Err(_) => {
            if reconnect {
                tracing::warn!("WebSocket subscription failed, attempting reconnection and retry");
                pubsub.reconnect_pubsub().await?;
                return subscribe_and_wait_for_signature(pubsub, signature, commitment, false)
                    .await;
            }

            tracing::error!("WebSocket subscription failed");

            return Err((
                StatusCode::BAD_GATEWAY,
                "Failed to subscribe to signature".to_string(),
            ));
        }
    };

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
                return Ok(processed_signature_result);
            }
        }

        tracing::error!("Signature subscription stream ended unexpectedly for {signature}");
        Err((
            StatusCode::BAD_GATEWAY,
            "Signature subscription stream ended unexpectedly".to_string(),
        ))
    })
    .await;

    unsubscribe().await;

    result
        .map_err(|_| {
            tracing::error!("Timeout while waiting for transaction confirmation for {signature}");
            (
                StatusCode::GATEWAY_TIMEOUT,
                "Unable to confirm transaction".to_string(),
            )
        })
        .and_then(|r| r)
}

#[derive(Debug, Clone)]
pub struct TransactionCostDetails {
    pub fee: u64,
    pub balance_spend: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub max_tries: u32,
    pub sleep_ms: u64,
}

/// Fetches transaction details from RPC and extracts cost information (fee and balance changes) for the tx fee payer.
/// If metadata is not available from RPC, falls back to computing gas spend from the transaction.
/// retry_config configures the retries of the RPC call with sleep on failure. This is useful in cases where the
/// transaction was sent with a lower commitment level, so it may not be confirmed yet.
#[tracing::instrument(skip_all, fields(tx_hash = %signature))]
pub async fn fetch_transaction_cost_details(
    rpc: &RpcClient,
    signature: &Signature,
    gas_spent: u64,
    retry_config: RetryConfig,
) -> anyhow::Result<TransactionCostDetails> {
    let config = RpcTransactionConfig {
        encoding: Some(UiTransactionEncoding::Base64),
        max_supported_transaction_version: Some(0),
        // this method does not support any commitment below confirmed
        commitment: Some(CommitmentConfig::confirmed()),
    };

    let mut last_error = None;

    for attempt in 0..retry_config.max_tries {
        if attempt > 0 {
            tokio::time::sleep(Duration::from_millis(retry_config.sleep_ms)).await;
        }

        match rpc.get_transaction_with_config(signature, config).await {
            Ok(tx_response) => {
                // balance_spend is positive if balance decreased
                let (fee, balance_spend) = tx_response
                    .transaction
                    .meta
                    .map(|meta| {
                        let balance_spend = meta
                            .pre_balances
                            .first()
                            .and_then(|&before| {
                                meta.post_balances.first().map(|&after| (before, after))
                            })
                            .and_then(|(before, after)| {
                                i64::try_from(after)
                                    .ok()
                                    .zip(i64::try_from(before).ok())
                                    .map(|(after_i64, before_i64)| {
                                        before_i64.saturating_sub(after_i64)
                                    })
                            });
                        (meta.fee, balance_spend)
                    })
                    .unwrap_or_else(|| (gas_spent, None));

                return Ok(TransactionCostDetails { fee, balance_spend });
            }
            Err(e) => {
                last_error = Some(e);
            }
        }
    }

    Err(anyhow::anyhow!(
        "Failed to fetch transaction from RPC after {} attempts: {:?}",
        retry_config.max_tries,
        last_error
    ))
}
