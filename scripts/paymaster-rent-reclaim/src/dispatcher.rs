use crate::config::RuntimeConfig;
use crate::generator::TransactionGenerator;
use crate::metrics::Metrics;
use anyhow::{Context, Result};
use arc_swap::ArcSwap;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use fogo_sessions_sdk::session::{Session, SESSION_MANAGER_ID};
use governor::{Quota, RateLimiter};
use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};
use solana_account_decoder_client_types::UiAccountEncoding;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_client::rpc_config::{RpcAccountInfoConfig, RpcProgramAccountsConfig};
use solana_client::rpc_filter::{Memcmp, RpcFilterType};
use solana_commitment_config::CommitmentConfig;
use solana_hash::Hash;
use solana_pubkey::Pubkey;
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;
use std::net::SocketAddr;
use std::num::NonZeroU32;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use tokio::{task::JoinSet, time::sleep};

type DirectRateLimiter = RateLimiter<
    governor::state::NotKeyed,
    governor::state::InMemoryState,
    governor::clock::DefaultClock,
>;

pub struct LoadTestDispatcher {
    config: RuntimeConfig,
    metrics: Arc<RwLock<Metrics>>,
    http_clients: Vec<Client>,
    next_http_client_index: AtomicUsize,
    rpc_client: Arc<RpcClient>,
    rate_limiter: Arc<DirectRateLimiter>,
    generator: Arc<TransactionGenerator>,
    blockhash: ArcSwap<Hash>,
}

#[derive(Serialize)]
struct SponsorAndSendRequest {
    transaction: String,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
enum SponsorAndSendResponse {
    Success {
        signature: String,
    },
    Failed {
        signature: String,
        error: serde_json::Value,
    },
}

pub const BLOCKHASH_UPDATE_INTERVAL_SECONDS: u64 = 10;
const HTTP_CLIENT_COUNT: usize = 6;

impl LoadTestDispatcher {
    pub async fn new(config: RuntimeConfig, metrics: Arc<RwLock<Metrics>>) -> Result<Self> {
        let http_client =
            if let Some(ref paymaster_ip_override) = config.external.paymaster_ip_override {
                Client::builder()
                    .timeout(Duration::from_secs(30))
                    .resolve(
                        Url::parse(&config.external.paymaster_endpoint)
                            .context("Failed to parse paymaster endpoint")?
                            .host_str()
                            .context("Failed to get paymaster host from the paymaster endpoint")?,
                        paymaster_ip_override.parse::<SocketAddr>()?,
                    )
                    .danger_accept_invalid_certs(true)
                    .build()
                    .context("Failed to create HTTP client")?
            } else {
                Client::builder()
                    .timeout(Duration::from_secs(30))
                    .build()
                    .context("Failed to create HTTP client")?
            };
        let http_clients = vec![http_client; HTTP_CLIENT_COUNT];

        let rpc_client = Arc::new(RpcClient::new_with_timeout_and_commitment(
            config.external.rpc_url.clone(),
            Duration::from_secs(600),
            CommitmentConfig::confirmed(),
        ));

        tracing::info!("Fetching initial blockhash from RPC...");
        let initial_blockhash = rpc_client
            .get_latest_blockhash()
            .await
            .context("Failed to fetch initial blockhash")?;

        tracing::info!("Fetching sponsor pubkeys from paymaster...");
        let sponsor_pubkeys = futures::future::try_join_all((0..config.external.number_of_sponsors.get()).map(async |i| -> Result<Pubkey> {
            let sponsor_url = format!(
                "{}/api/sponsor_pubkey?domain={}&index={}",
                config.external.paymaster_endpoint,
                urlencoding::encode(&config.external.domain),
                i
            );
            let sponsor_pubkey: Pubkey = http_clients
                .first()
                .expect("HTTP client list must contain at least one client")
                .get(&sponsor_url)
                .send()
                .await
                .context("Failed to fetch sponsor pubkey")?
                .text()
                .await
                .context("Failed to parse sponsor pubkey response")?
                .parse()
                .context(format!("Failed to parse sponsor pubkey, make sure the domain \"{}\" supports {} sponsors", config.external.domain, config.external.number_of_sponsors))?;
            Ok(sponsor_pubkey)
        })).await?;

        let generator = Arc::new(TransactionGenerator::new(
            sponsor_pubkeys,
        ));

        let rate_per_second =
            NonZeroU32::new(config.request_rps as u32).context("Request rate must be non-zero")?;
        let quota = Quota::per_second(rate_per_second);
        let rate_limiter = Arc::new(RateLimiter::direct(quota));

        Ok(Self {
            config,
            metrics,
            http_clients,
            next_http_client_index: AtomicUsize::new(0),
            rpc_client,
            rate_limiter,
            generator,
            blockhash: ArcSwap::from_pointee(initial_blockhash),
        })
    }

    /// Run the load test for the specified duration
    pub async fn run(self: &Arc<Self>) -> Result<()> {
        let blockhash_updater = self.spawn_blockhash_updater();
        let mut tasks = JoinSet::new();

        for i in 0..u8::MAX {
            tracing::info!("Fetching session accounts for index {}", i);
            let program_accounts = self
                .rpc_client
                .get_program_accounts_with_config(
                    &SESSION_MANAGER_ID,
                    RpcProgramAccountsConfig {
                        account_config: RpcAccountInfoConfig {
                            encoding: Some(UiAccountEncoding::Base64Zstd),
                            commitment: Some(CommitmentConfig::finalized()),
                            ..Default::default()
                        },
                        filters: Some(vec![
                            RpcFilterType::Memcmp(Memcmp::new(
                                43,
                                solana_client::rpc_filter::MemcmpEncodedBytes::Bytes(vec![i]),
                            )),
                        ]),
                        sort_results: Some(false),
                        ..Default::default()
                    },
                )
                .await?;
            tracing::info!("Found {} session accounts", program_accounts.len());

            let session_accounts = program_accounts
                .iter()
                .filter_map(|(pubkey, account)| {
                    Session::try_deserialize(&mut account.data.as_slice())
                        .ok()
                        .and_then(|session| {
                            session.expiration().ok().and_then(|expiration| {
                                if expiration
                                    < SystemTime::now()
                                        .duration_since(UNIX_EPOCH)
                                        .unwrap()
                                        .as_secs() as i64
                                {
                                    Some((*pubkey, session))
                                } else {
                                    None
                                }
                            })
                        })
                })
                .collect::<Vec<(Pubkey, Session)>>();

            tracing::info!(
                "the first 10 elements of session_accounts: {:?}",
                session_accounts
                    .iter()
                    .take(20)
                    .map(|(pubkey, session)| (pubkey.to_string(), session))
                    .collect::<Vec<_>>()
            );
            tracing::info!(
                "total number of session accounts: {}",
                session_accounts.len()
            );

            let chunks = session_accounts
                .chunks(20)
                .map(|c| c.to_vec())
                .collect::<Vec<_>>();
            for accounts_owned in chunks {
                self.rate_limiter.until_ready().await;

                let current_blockhash = **self.blockhash.load();
                let dispatcher = self.clone();
                tasks.spawn(async move {
                    if let Err(e) = dispatcher
                        .send_one_request(&accounts_owned, current_blockhash)
                        .await
                    {
                        tracing::error!("Request error: {}", e);
                    }
                });
            }

            while let Some(result) = tasks.join_next().await {
                if let Err(e) = result {
                    tracing::error!("Task panicked: {}", e);
                }
            }
        }

        blockhash_updater.abort();

        Ok(())
    }

    async fn send_one_request(
        &self,
        accounts: &[(Pubkey, Session)],
        blockhash: Hash,
    ) -> Result<()> {
        let transaction = self.generator.generate(accounts, blockhash)?;

        self.metrics.write().await.record_request_sent();

        let start = Instant::now();
        let result = self.send_sponsor_and_send_request(&transaction).await;
        let latency = start.elapsed();

        match result {
            Ok(signature) => {
                tracing::debug!(
                    "Request succeeded: {} ({:.2}ms)",
                    signature,
                    latency.as_secs_f64() * 1000.0
                );
                self.metrics.write().await.record_success(latency);
            }
            Err(e) => {
                tracing::warn!(
                    "Request failed: {:?} ({:.2}ms)",
                    e,
                    latency.as_secs_f64() * 1000.0
                );
                self.metrics.write().await.record_failure(latency);
            }
        }

        Ok(())
    }

    fn next_http_client(&self) -> &Client {
        &self.http_clients
            [self.next_http_client_index.fetch_add(1, Ordering::Relaxed) % self.http_clients.len()]
    }

    async fn send_sponsor_and_send_request(
        &self,
        transaction: &VersionedTransaction,
    ) -> Result<Signature> {
        let config = bincode::config::standard();
        let tx_bytes = bincode::serde::encode_to_vec(transaction, config)
            .context("Failed to serialize transaction")?;
        let tx_base64 = BASE64.encode(&tx_bytes);

        let request_body = SponsorAndSendRequest {
            transaction: tx_base64,
        };

        let url = format!(
            "{}/api/sponsor_and_send?domain={}",
            self.config.external.paymaster_endpoint,
            urlencoding::encode(&self.config.external.domain)
        );

        let response = self
            .next_http_client()
            .post(&url)
            .json(&request_body)
            .send()
            .await
            .context("Failed to send HTTP request")?;

        let status = response.status();

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!("HTTP {status}: {error_text}");
        }

        let response_body: SponsorAndSendResponse =
            response.json().await.context("Failed to parse response")?;

        match response_body {
            SponsorAndSendResponse::Success { signature } => {
                let sig = signature.parse().context("Failed to parse signature")?;
                Ok(sig)
            }
            SponsorAndSendResponse::Failed { signature, error } => {
                anyhow::bail!("Transaction failed: {error:?} (sig: {signature})")
            }
        }
    }

    /// Spawn a background task to update blockhash periodically
    fn spawn_blockhash_updater(self: &Arc<Self>) -> tokio::task::JoinHandle<()> {
        let dispatcher = self.clone();

        tokio::spawn(async move {
            loop {
                sleep(Duration::from_secs(BLOCKHASH_UPDATE_INTERVAL_SECONDS)).await;

                match dispatcher.rpc_client.get_latest_blockhash().await {
                    Ok(new_blockhash) => {
                        dispatcher.blockhash.store(Arc::new(new_blockhash));
                        tracing::debug!("Updated blockhash: {}", new_blockhash);
                    }
                    Err(e) => {
                        tracing::warn!("Failed to update blockhash: {}", e);
                    }
                }
            }
        })
    }
}
