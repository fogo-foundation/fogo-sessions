use axum::{http::StatusCode, response::ErrorResponse};
use futures::stream::StreamExt;
use solana_client::{
    nonblocking::rpc_client::RpcClient,
    rpc_config::{RpcSendTransactionConfig, RpcSignatureSubscribeConfig},
};
use solana_commitment_config::CommitmentConfig;
use solana_pubsub_client::nonblocking::pubsub_client::PubsubClient;
use solana_rpc_client_api::client_error::Error;
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_error::TransactionError;
use std::time::Duration;
use tokio::time::timeout;

pub fn resolve_rpc_urls(
    rpc_url_http: Option<String>,
    rpc_url_ws: Option<String>,
) -> anyhow::Result<(String, String)> {
    match (rpc_url_http, rpc_url_ws) {
        (Some(http), Some(ws)) => Ok((http, ws)),
        (Some(http), None) => {
            let ws = http.replace("http", "ws");
            Ok((http, ws))
        }
        (None, Some(ws)) => {
            let http = ws.replace("ws", "http");
            Ok((http, ws))
        }
        (None, None) => Err(anyhow::anyhow!(
            "At least one of rpc_url_http or rpc_url_ws must be provided"
        )),
    }
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
