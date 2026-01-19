use async_trait::async_trait;
use reqwest::header::{CONTENT_TYPE, RETRY_AFTER};
use reqwest::{header, StatusCode};
use serde::{Deserialize, Serialize};
use solana_client::rpc_request::{RpcError, RpcRequest, RpcResponseErrorData};
use solana_client::rpc_response::RpcSimulateTransactionResult;
use solana_rpc_client::rpc_sender::RpcSender;
use solana_rpc_client::rpc_sender::RpcTransportStats;
use solana_rpc_client_api::client_error::Result;
use solana_rpc_client_api::custom_error;
use solana_rpc_client_api::error_object::RpcErrorObject;
use solana_transaction_error::TransactionError;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;

pub const TRANSACTION_CONFIRMED_FAILED: i64 = -32604;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RpcTransactionFailedResult {
    pub err: TransactionError,
}

/// Pooled Http sender for an RPC interface, it creates an internal http connection pool
/// to maximize parallel streams to the server
pub struct PooledHttpSender {
    clients: Vec<Arc<reqwest_middleware::ClientWithMiddleware>>,
    url: String,
    request_id: AtomicU64,
}

/// Nonblocking [`RpcSender`] over HTTP.
impl PooledHttpSender {
    /// Create an HTTP RPC sender.
    ///
    /// The URL is an HTTP URL, usually for port 8899, as in
    /// "http://localhost:8899". The sender has a default timeout of 30 seconds.
    pub fn new<U: ToString>(url: U, pool: usize) -> Self {
        Self::new_with_timeout(url, Duration::from_secs(30), pool)
    }

    /// Create an HTTP RPC sender.
    ///
    /// The URL is an HTTP URL, usually for port 8899.
    pub fn new_with_timeout<U: ToString>(url: U, timeout: Duration, pool: usize) -> Self {
        let clients = (0..pool)
            .map(|_| {
                Arc::new(
                    reqwest_middleware::ClientBuilder::new(
                        reqwest::Client::builder()
                            .default_headers(Self::default_headers())
                            .pool_max_idle_per_host(1)
                            .timeout(timeout)
                            .pool_idle_timeout(timeout)
                            .build()
                            .expect("Failed to create RPC client"),
                    )
                    .build(),
                )
            })
            .collect::<Vec<_>>();

        Self {
            clients,
            url: url.to_string(),
            request_id: AtomicU64::new(1),
        }
    }

    /// Create default headers used by HTTP Sender.
    pub fn default_headers() -> header::HeaderMap {
        let mut default_headers = header::HeaderMap::new();
        default_headers.append(
            header::HeaderName::from_static("solana-client"),
            header::HeaderValue::from_static("paymaster"),
        );
        default_headers
    }
}

#[allow(clippy::unwrap_used,
    reason = "This is based on solana_rpc_client::http_sender")]
#[async_trait]
impl RpcSender for PooledHttpSender {
    async fn send(
        &self,
        request: RpcRequest,
        params: serde_json::Value,
    ) -> Result<serde_json::Value> {
        let request_id = self.request_id.fetch_add(1, Ordering::Relaxed);
        let request_json = request.build_request_json(request_id, params).to_string();

        let client = self.clients[usize::try_from(request_id)
            .expect("usize is u64 in modern platforms")
            % self.clients.len()]
        .clone();
        let mut too_many_requests_retries = 5;
        loop {
            let response = {
                let request_json = request_json.clone();
                client
                    .post(&self.url)
                    .header(CONTENT_TYPE, "application/json")
                    .body(request_json)
                    .send()
                    .await
            }?;

            if !response.status().is_success() {
                if response.status() == StatusCode::TOO_MANY_REQUESTS
                    && too_many_requests_retries > 0
                {
                    let mut duration = Duration::from_millis(500);
                    if let Some(retry_after) = response.headers().get(RETRY_AFTER) {
                        if let Ok(retry_after) = retry_after.to_str() {
                            if let Ok(retry_after) = retry_after.parse::<u64>() {
                                if retry_after < 120 {
                                    duration = Duration::from_secs(retry_after);
                                }
                            }
                        }
                    }

                    too_many_requests_retries -= 1;
                    sleep(duration).await;
                    continue;
                }
                return Err(response.error_for_status().unwrap_err().into());
            }

            let mut json = response.json::<serde_json::Value>().await?;
            if json["error"].is_object() {
                return match serde_json::from_value::<RpcErrorObject>(json["error"].clone()) {
                    Ok(rpc_error_object) => {
                        let data = match rpc_error_object.code {
                            custom_error::JSON_RPC_SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE => {
                                match serde_json::from_value::<RpcSimulateTransactionResult>(json["error"]["data"].clone()) {
                                    Ok(data) => RpcResponseErrorData::SendTransactionPreflightFailure(data),
                                    Err(_) => {
                                        RpcResponseErrorData::Empty
                                    }
                                }
                            },
                            custom_error::JSON_RPC_SERVER_ERROR_NODE_UNHEALTHY => {
                                match serde_json::from_value::<custom_error::NodeUnhealthyErrorData>(json["error"]["data"].clone()) {
                                    Ok(custom_error::NodeUnhealthyErrorData {num_slots_behind}) => RpcResponseErrorData::NodeUnhealthy {num_slots_behind},
                                    Err(_err) => {
                                        RpcResponseErrorData::Empty
                                    }
                                }
                            },
                            TRANSACTION_CONFIRMED_FAILED => {
                                match serde_json::from_value::<RpcTransactionFailedResult>(json["error"]["data"].clone()) {
                                    Ok(data) => {
                                        // transaction is confirmed as failed
                                        return Err(solana_rpc_client_api::client_error::Error {
                                            request: None,
                                            kind: solana_rpc_client_api::client_error::ErrorKind::TransactionError(data.err),
                                        });
                                    },
                                    Err(_) => {
                                        RpcResponseErrorData::Empty
                                    }
                                }
                            },
                            _ => RpcResponseErrorData::Empty
                        };

                        Err(RpcError::RpcResponseError {
                            code: rpc_error_object.code,
                            message: rpc_error_object.message,
                            data,
                        }
                        .into())
                    }
                    Err(err) => Err(RpcError::RpcRequestError(format!(
                        "Failed to deserialize RPC error response: {} [{}]",
                        serde_json::to_string(&json["error"]).unwrap(),
                        err
                    ))
                    .into()),
                };
            }
            return Ok(json["result"].take());
        }
    }

    fn get_transport_stats(&self) -> RpcTransportStats {
        RpcTransportStats {
            request_count: 0,
            elapsed_time: Default::default(),
            rate_limited_time: Default::default(),
        }
    }

    fn url(&self) -> String {
        self.url.clone()
    }
}
