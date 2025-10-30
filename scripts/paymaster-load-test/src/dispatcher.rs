use crate::config::RuntimeConfig;
use crate::generator::TransactionGenerator;
use crate::metrics::LoadTestMetrics;
use anyhow::{Context, Result};
use arc_swap::ArcSwap;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use governor::{Quota, RateLimiter};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_commitment_config::CommitmentConfig;
use solana_hash::Hash;
use solana_pubkey::Pubkey;
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;
use std::num::NonZeroU32;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::sleep;

type DirectRateLimiter = RateLimiter<
    governor::state::NotKeyed,
    governor::state::InMemoryState,
    governor::clock::DefaultClock,
>;

pub struct LoadTestDispatcher {
    config: RuntimeConfig,
    metrics: Arc<LoadTestMetrics>,
    http_client: Client,
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
    Success { signature: String },
    Failed {
        signature: String,
        error: serde_json::Value,
    },
}

pub const BLOCKHASH_UPDATE_INTERVAL_SECONDS: u64 = 10;

impl LoadTestDispatcher {
    pub async fn new(config: RuntimeConfig, metrics: Arc<LoadTestMetrics>) -> Result<Self> {
        let http_client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .context("Failed to create HTTP client")?;

        let rpc_client = Arc::new(RpcClient::new_with_commitment(
            config.external.rpc_url.clone(),
            CommitmentConfig::confirmed(),
        ));

        tracing::info!("Fetching initial blockhash from RPC...");
        let initial_blockhash = rpc_client
            .get_latest_blockhash()
            .await
            .context("Failed to fetch initial blockhash")?;

        tracing::info!("Fetching sponsor pubkey from paymaster...");
        let sponsor_url = format!(
            "{}/api/sponsor_pubkey?domain={}",
            config.external.paymaster_endpoint,
            urlencoding::encode(&config.external.domain)
        );
        let sponsor_str: String = http_client
            .get(&sponsor_url)
            .send()
            .await
            .context("Failed to fetch sponsor pubkey")?
            .text()
            .await
            .context("Failed to parse sponsor pubkey response")?;
        let sponsor_pubkey: Pubkey = sponsor_str
            .parse()
            .context("Failed to parse sponsor pubkey")?;

        let generator = Arc::new(TransactionGenerator::new(
            sponsor_pubkey,
            config.external.chain_id.clone(),
            config.external.domain.clone(),
        ));

        let rate_per_second = NonZeroU32::new(config.request_rps as u32)
            .context("Request rate must be non-zero")?;
        let quota = Quota::per_second(rate_per_second);
        let rate_limiter = Arc::new(RateLimiter::direct(quota));

        Ok(Self {
            config,
            metrics,
            http_client,
            rpc_client,
            rate_limiter,
            generator,
            blockhash: ArcSwap::from_pointee(initial_blockhash),
        })
    }


    /// Run the load test for the specified duration
    pub async fn run(self: &Arc<Self>, duration: Duration) -> Result<()> {
        let start = Instant::now();
        let end = start + duration;

        let blockhash_updater = self.spawn_blockhash_updater();

        while Instant::now() < end {
            self.rate_limiter.until_ready().await;

            let current_blockhash = **self.blockhash.load();
            let dispatcher = self.clone();
            tokio::spawn(async move {
                if let Err(e) = dispatcher.send_one_request(current_blockhash).await {
                    tracing::error!("Request error: {}", e);
                }
            });
        }

        // sleep to await the final requested tasks
        // TODO: we can do better
        sleep(Duration::from_secs(2)).await;

        blockhash_updater.abort();

        Ok(())
    }

    async fn send_one_request(&self, blockhash: Hash) -> Result<()> {
        let validity_type = self.config.validity_distribution.sample();

        let transaction = self.generator.generate(validity_type, blockhash)?;

        self.metrics.record_request_sent(validity_type);

        let start = Instant::now();
        let result = self.send_sponsor_and_send_request(&transaction).await;
        let latency = start.elapsed();

        match result {
            Ok(signature) => {
                tracing::debug!(
                    "Request succeeded: {} ({:?}, {:.2}ms)",
                    signature,
                    validity_type,
                    latency.as_secs_f64() * 1000.0
                );
                self.metrics.record_success(validity_type, latency);
            }
            Err(e) => {
                tracing::debug!(
                    "Request failed: {:?} ({:?}, {:.2}ms)",
                    e,
                    validity_type,
                    latency.as_secs_f64() * 1000.0
                );
                self.metrics.record_failure(validity_type, latency);
            }
        }

        Ok(())
    }

    async fn send_sponsor_and_send_request(&self, transaction: &VersionedTransaction) -> Result<Signature> {
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

        let response = self.http_client
            .post(&url)
            .header("Origin", &self.config.external.domain)
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
            anyhow::bail!("HTTP {}: {}", status, error_text);
        }

        let response_body: SponsorAndSendResponse = response
            .json()
            .await
            .context("Failed to parse response")?;

        match response_body {
            SponsorAndSendResponse::Success { signature } => {
                let sig = signature
                    .parse()
                    .context("Failed to parse signature")?;
                Ok(sig)
            }
            SponsorAndSendResponse::Failed { signature, error } => {
                anyhow::bail!("Transaction failed: {:?} (sig: {})", error, signature)
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
