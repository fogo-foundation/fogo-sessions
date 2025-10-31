use anyhow::{anyhow, Context, Result};
use base64::prelude::*;
use clap::{Parser, Subcommand};
use config::File;
use dashmap::DashMap;
use fogo_paymaster::{
    config_manager::config::{Config, Domain},
    constraint::{ContextualDomainKeys, TransactionVariation},
    rpc::ChainIndex, transaction::TransactionToValidate,
};
use fogo_sessions_sdk::domain_registry::get_domain_record_address;
use futures::stream::{FuturesOrdered, StreamExt};
use governor::{
    clock::DefaultClock,
    middleware::NoOpMiddleware,
    state::{InMemoryState, NotKeyed},
    Quota, RateLimiter,
};
use solana_client::{
    nonblocking::rpc_client::RpcClient, rpc_client::GetConfirmedSignaturesForAddress2Config,
    rpc_config::RpcTransactionConfig,
};
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_status_client_types::UiTransactionEncoding;
use std::{collections::HashMap, num::NonZeroU32, str::FromStr};

#[derive(Parser)]
#[command(name = "tx-validator")]
#[command(about = "Validates transactions against domain configuration variations")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Validate {
        /// Path to the TOML configuration file
        #[arg(short, long)]
        config: String,

        /// Domain name to check against (if not provided, checks all domains)
        #[arg(short, long)]
        domain: Option<String>,

        /// Transaction hash to fetch from RPC
        #[arg(long, conflicts_with_all = ["transaction", "recent_sponsor_txs"])]
        transaction_hash: Option<String>,

        /// Base64 encoded serialized transaction
        #[arg(short, long, conflicts_with_all = ["transaction_hash", "recent_sponsor_txs"])]
        transaction: Option<String>,

        /// Number of recent sponsor transactions to fetch and validate
        #[arg(long, conflicts_with_all = ["transaction", "transaction_hash"])]
        recent_sponsor_txs: Option<usize>,

        /// RPC rate limit (per second)
        #[arg(long, default_value_t = 10)]
        rpc_quota_per_second: u32,

        /// RPC HTTP URL
        #[arg(long)]
        rpc_url_http: String,
    },
}

type RpcRateLimiter = RateLimiter<NotKeyed, InMemoryState, DefaultClock, NoOpMiddleware>;

pub fn load_file_config(config_path: &str) -> Result<Config> {
    let mut config: Config = config::Config::builder()
        .add_source(File::with_name(config_path))
        .build()?
        .try_deserialize()?;
    config.assign_defaults();
    Ok(config)
}
#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Validate {
            config,
            domain,
            transaction_hash,
            transaction,
            recent_sponsor_txs,
            rpc_quota_per_second,
            rpc_url_http,
        } => {
            let config = load_file_config(&config)?;
            let domains = get_domains_for_validation(&config, &domain);
            let chain_index = ChainIndex {
                rpc: RpcClient::new(rpc_url_http),
                lookup_table_cache: DashMap::new(),
            };

            let rpc_limiter = RateLimiter::direct(Quota::per_second(
                NonZeroU32::new(rpc_quota_per_second)
                    .expect("RPC quota per second must be greater than zero"),
            ));

            let (transactions, is_batch) = fetch_transactions(
                recent_sponsor_txs,
                transaction_hash,
                transaction,
                &domain,
                &domains,
                &chain_index,
                &rpc_limiter,
            )
            .await?;

            let contextual_keys_cache: HashMap<_, _> =
                futures::future::try_join_all(domains.iter().map(|domain| async {
                    let keys = compute_contextual_keys(&domain.domain).await?;
                    Ok::<_, anyhow::Error>((domain.domain.clone(), keys))
                }))
                .await?
                .into_iter()
                .collect();

            let (validation_counts, failure_count) = validate_transactions(
                &transactions,
                &domains,
                &chain_index,
                &contextual_keys_cache,
                is_batch,
                true,
            )
            .await;

            if is_batch {
                print_summary(validation_counts, failure_count);
            }
        }
    }

    Ok(())
}

fn get_domains_for_validation<'a>(
    config: &'a fogo_paymaster::config_manager::config::Config,
    domain: &Option<String>,
) -> Vec<&'a Domain> {
    if let Some(domain_name) = domain {
        vec![config
            .domains
            .iter()
            .find(|d| d.domain == *domain_name)
            .expect("Specified domain not found in config")]
    } else {
        config.domains.iter().collect()
    }
}

async fn fetch_transactions(
    recent_sponsor_txs: Option<usize>,
    transaction_hash: Option<String>,
    transaction: Option<String>,
    domain: &Option<String>,
    domains: &[&Domain],
    chain_index: &ChainIndex,
    rpc_limiter: &RpcRateLimiter,
) -> Result<(Vec<VersionedTransaction>, bool)> {
    if let Some(limit) = recent_sponsor_txs {
        let domain_for_sponsor = if let Some(domain_name) = domain {
            domain_name.as_str()
        } else if domains.len() == 1 {
            &domains[0].domain
        } else if domains.is_empty() {
            return Err(anyhow!("No domains found in config"));
        } else {
            return Err(anyhow!(
                "When using --recent-sponsor-txs with multiple domains, --domain must be specified"
            ));
        };
        let sponsor = compute_contextual_keys(domain_for_sponsor).await?.sponsor;
        let txs = fetch_recent_sponsor_transactions(&sponsor, limit, &chain_index.rpc, rpc_limiter)
            .await?;
        println!(
            "Fetched {} recent transactions from sponsor {}\n",
            txs.len(),
            sponsor
        );
        Ok((txs, true))
    } else if let Some(tx_hash) = transaction_hash {
        let tx_hash = Signature::from_str(&tx_hash)
            .with_context(|| format!("Invalid transaction signature: {tx_hash}"))?;
        let tx = fetch_transaction_from_rpc(tx_hash, &chain_index.rpc, rpc_limiter).await?;
        Ok((vec![tx], false))
    } else if let Some(tx) = transaction {
        let tx = parse_transaction_from_base64(&tx)?;
        Ok((vec![tx], false))
    } else {
        Err(anyhow!(
            "Either --transaction-hash, --transaction, or --recent-sponsor-txs must be provided"
        ))
    }
}

async fn validate_transactions(
    transactions: &[VersionedTransaction],
    domains: &[&Domain],
    chain_index: &ChainIndex,
    contextual_keys_cache: &HashMap<String, ContextualDomainKeys>,
    is_batch: bool,
    verbose: bool,
) -> (HashMap<(String, String), usize>, usize) {
    let mut validation_stream = transactions
        .iter()
        .enumerate()
        .map(|(idx, tx)| async move {
            let results = futures::future::join_all(domains.iter().map(|domain| async {
                let variations =
                    get_matching_variations(tx, domain, chain_index, contextual_keys_cache)
                        .await
                        .unwrap_or_default();
                variations
                    .into_iter()
                    .map(|v| (domain.domain.as_str(), v))
                    .collect::<Vec<_>>()
            }))
            .await
            .into_iter()
            .flatten()
            .collect::<Vec<_>>();

            (idx, tx, results)
        })
        .collect::<FuturesOrdered<_>>();

    let indent = if is_batch { "  " } else { "" };
    let mut validation_counts = HashMap::new();
    let mut failure_count = 0;

    while let Some((idx, tx, validations)) = validation_stream.next().await {
        if validations.is_empty() {
            failure_count += 1;
        } else {
            for (domain_name, variation) in &validations {
                *validation_counts
                    .entry((domain_name.to_string(), variation.name().to_string()))
                    .or_insert(0) += 1;
            }
        }

        if verbose {
            if is_batch {
                println!("Transaction {} ({})", idx + 1, tx.signatures[0]);
            }

            if validations.is_empty() {
                println!("{indent}❌ Does not match any variations");
            } else {
                println!("{indent}✅ Matches:");
                for (domain_name, variation) in &validations {
                    println!(
                        "{}  - Domain: {domain_name}, Variation: {}",
                        indent,
                        variation.name()
                    );
                }
            }

            if is_batch {
                println!();
            }
        }
    }

    (validation_counts, failure_count)
}

fn print_summary(validation_counts: HashMap<(String, String), usize>, failure_count: usize) {
    println!("Summary:");
    println!("========");

    let mut sorted_counts: Vec<_> = validation_counts.into_iter().collect();
    sorted_counts.sort_by(|a, b| b.1.cmp(&a.1));

    let max_domain_len = sorted_counts
        .iter()
        .map(|((domain_name, _), _)| domain_name.len())
        .chain(std::iter::once("-".len()))
        .max()
        .unwrap_or(0);

    let max_variation_len = sorted_counts
        .iter()
        .map(|((_, variation_name), _)| variation_name.len())
        .chain(std::iter::once("Failures".len()))
        .max()
        .unwrap_or(0);

    for ((domain_name, variation_name), count) in sorted_counts {
        println!("✅ {domain_name:max_domain_len$}  {variation_name:max_variation_len$}  {count}");
    }

    if failure_count > 0 {
        println!(
            "❌ {:domain_width$}  {:variation_width$}  {}",
            "-",
            "Failures",
            failure_count,
            domain_width = max_domain_len,
            variation_width = max_variation_len
        );
    }
}

async fn fetch_transaction_from_rpc(
    tx_hash: Signature,
    rpc_client: &RpcClient,
    rpc_limiter: &RpcRateLimiter,
) -> Result<VersionedTransaction> {
    let config = RpcTransactionConfig {
        encoding: Some(UiTransactionEncoding::Base64),
        max_supported_transaction_version: Some(0),
        ..Default::default()
    };

    rpc_limiter.until_ready().await;
    let transaction = rpc_client
        .get_transaction_with_config(&tx_hash, config)
        .await
        .with_context(|| format!("Failed to fetch transaction from RPC: {tx_hash}"))?;

    let versioned_transaction = transaction
        .transaction
        .transaction
        .decode()
        .ok_or_else(|| anyhow!("Failed to decode transaction from RPC response"))?;

    Ok(versioned_transaction)
}

async fn fetch_recent_sponsor_signatures(
    sponsor_pubkey: &solana_pubkey::Pubkey,
    mut number: usize,
    rpc_client: &RpcClient,
    rpc_limiter: &RpcRateLimiter,
) -> Result<Vec<Signature>> {
    let mut signatures = Vec::new();
    let mut before = None;
    while number > 0 {
        rpc_limiter.until_ready().await;
        let new_signatures = rpc_client
            .get_signatures_for_address_with_config(
                sponsor_pubkey,
                GetConfirmedSignaturesForAddress2Config {
                    limit: Some(number.min(1000)),
                    before,
                    ..Default::default()
                },
            )
            .await
            .with_context(|| format!("Failed to fetch signatures for sponsor {sponsor_pubkey}"))?;

        number -= new_signatures.len();
        if new_signatures.is_empty() {
            break;
        }
        before = new_signatures
            .last()
            .and_then(|s| Signature::from_str(&s.signature).ok());

        signatures.extend(new_signatures);
    }

    signatures
        .into_iter()
        .map(|s| {
            Signature::from_str(&s.signature)
                .map_err(|e| anyhow!("Invalid signature from RPC: {}", s.signature).context(e))
        })
        .collect::<Result<Vec<_>>>()
}

async fn fetch_recent_sponsor_transactions(
    sponsor_pubkey: &solana_pubkey::Pubkey,
    number: usize,
    rpc_client: &RpcClient,
    rpc_limiter: &RpcRateLimiter,
) -> Result<Vec<VersionedTransaction>> {
    let signatures_to_fetch =
        fetch_recent_sponsor_signatures(sponsor_pubkey, number, rpc_client, rpc_limiter).await?;
    let transaction_futures = signatures_to_fetch
        .into_iter()
        .map(|signature| fetch_transaction_from_rpc(signature, rpc_client, rpc_limiter));
    let results = futures::future::join_all(transaction_futures).await;

    results.into_iter().collect::<Result<Vec<_>, _>>()
}

fn parse_transaction_from_base64(encoded_tx: &str) -> Result<VersionedTransaction> {
    let tx_bytes = BASE64_STANDARD
        .decode(encoded_tx)
        .context("Failed to decode base64 transaction")?;

    bincode::deserialize(&tx_bytes).context("Failed to deserialize transaction")
}

async fn get_matching_variations<'a>(
    transaction: &VersionedTransaction,
    domain: &'a Domain,
    chain_index: &ChainIndex,
    contextual_keys_cache: &HashMap<String, ContextualDomainKeys>,
) -> Result<Vec<&'a TransactionVariation>> {
    let mut matching_variations = Vec::new();

    let contextual_keys = if let Some(keys) = contextual_keys_cache.get(&domain.domain) {
        keys
    } else {
        &compute_contextual_keys(&domain.domain).await?
    };

    for variation in &domain.tx_variations {
        let matches = match variation {
            TransactionVariation::V0(v0_variation) => {
                v0_variation.validate_transaction(transaction).is_ok()
            }
            TransactionVariation::V1(v1_variation) => {
                match TransactionToValidate::new(transaction) {
                    Ok(paymaster_transaction) => v1_variation.validate_transaction(&paymaster_transaction, contextual_keys, chain_index).await.is_ok(),
                    Err(_) => false,
                }
            }
        };

        if matches {
            matching_variations.push(variation);
        }
    }

    Ok(matching_variations)
}

async fn compute_contextual_keys(domain: &str) -> Result<ContextualDomainKeys> {
    let domain_registry = get_domain_record_address(domain);

    let url = format!("https://paymaster.fogo.io/api/sponsor_pubkey?domain={domain}");
    let client = reqwest::Client::new();
    let response =
        client.get(&url).send().await.with_context(|| {
            format!("Failed to fetch sponsor pubkey from API for domain: {domain}")
        })?;

    if !response.status().is_success() {
        return Err(anyhow!(
            "API returned error status {} when fetching sponsor pubkey for domain: {domain}",
            response.status()
        ));
    }

    let sponsor_str = response
        .text()
        .await
        .with_context(|| format!("Failed to read response body for domain: {domain}"))?;

    let sponsor = solana_pubkey::Pubkey::from_str(sponsor_str.trim()).with_context(|| {
        format!("Failed to parse sponsor pubkey from API response for domain: {domain}")
    })?;

    Ok(ContextualDomainKeys {
        domain_registry,
        sponsor,
    })
}
