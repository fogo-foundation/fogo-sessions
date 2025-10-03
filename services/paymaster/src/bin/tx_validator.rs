use anyhow::{anyhow, Context, Result};
use base64::prelude::*;
use clap::{Parser, Subcommand};
use dashmap::DashMap;
use futures::stream::{FuturesOrdered, StreamExt};
use solana_client::{rpc_client::RpcClient, rpc_config::RpcTransactionConfig};
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_status_client_types::UiTransactionEncoding;
use std::{collections::HashMap, str::FromStr};

use fogo_paymaster::{
    api::ChainIndex,
    config::{load_config, Domain},
    constraint::{ContextualDomainKeys, TransactionVariation},
};

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
    },
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
        } => {
            let config = load_config(&config)
                .with_context(|| format!("Failed to load config from {config}"))?;
            let domains = if let Some(ref domain_name) = domain {
                vec![config
                    .domains
                    .iter()
                    .find(|d| d.domain == *domain_name)
                    .ok_or_else(|| anyhow!("Domain '{domain_name}' not found in config"))?]
            } else {
                config.domains.iter().collect()
            };

            let chain_index = ChainIndex {
                rpc: RpcClient::new(config.solana_url),
                lookup_table_cache: DashMap::new(),
            };

            let (transactions, is_batch) = if let Some(limit) = recent_sponsor_txs {
                let domain_for_sponsor = if let Some(domain_name) = &domain {
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
                let txs =
                    fetch_recent_sponsor_transactions(&sponsor, limit, &chain_index.rpc).await?;
                println!(
                    "Fetched {} recent transactions from sponsor {}\n",
                    txs.len(),
                    sponsor
                );
                (txs, true)
            } else if let Some(tx_hash) = transaction_hash {
                let tx = fetch_transaction_from_rpc(&tx_hash, &chain_index.rpc).await?;
                (vec![tx], false)
            } else if let Some(tx) = transaction {
                let tx = parse_transaction_from_base64(&tx)?;
                (vec![tx], false)
            } else {
                return Err(anyhow!(
                    "Either --transaction-hash, --transaction, or --recent-sponsor-txs must be provided"
                ));
            };

            let mut validation_stream = transactions
                .iter()
                .enumerate()
                .map(|(idx, tx)| {
                    let domains = &domains;
                    let chain_index = &chain_index;
                    async move {
                        let results =
                            futures::future::join_all(domains.iter().map(|domain| async {
                                let variations = get_matching_variations(tx, domain, chain_index)
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
                    }
                })
                .collect::<FuturesOrdered<_>>();

            let indent = if is_batch { "  " } else { "" };
            let mut validation_counts = HashMap::new();
            let mut failure_count = 0;

            while let Some((idx, tx, validations)) = validation_stream.next().await {
                if is_batch {
                    println!("Transaction {} ({})", idx + 1, tx.signatures[0]);
                }

                if validations.is_empty() {
                    println!("{}❌ Does not match any variations", indent);
                    failure_count += 1;
                } else {
                    println!("{}✅ Matches:", indent);
                    for (domain_name, variation) in &validations {
                        println!(
                            "{}  - Domain: {domain_name}, Variation: {}",
                            indent,
                            variation.name()
                        );
                        *validation_counts
                            .entry((domain_name.to_string(), variation.name().to_string()))
                            .or_insert(0) += 1;
                    }
                }

                if is_batch {
                    println!();
                }
            }

            if is_batch {
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
                    println!(
                        "✅ {:domain_width$}  {:variation_width$}  {}",
                        domain_name,
                        variation_name,
                        count,
                        domain_width = max_domain_len,
                        variation_width = max_variation_len
                    );
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
        }
    }

    Ok(())
}

async fn fetch_transaction_from_rpc(
    tx_hash: &str,
    rpc_client: &RpcClient,
) -> Result<VersionedTransaction> {
    let signature = Signature::from_str(tx_hash)
        .with_context(|| format!("Invalid transaction signature: {tx_hash}"))?;

    let config = RpcTransactionConfig {
        encoding: Some(UiTransactionEncoding::Base64),
        max_supported_transaction_version: Some(0),
        ..Default::default()
    };

    let transaction = rpc_client
        .get_transaction_with_config(&signature, config)
        .with_context(|| format!("Failed to fetch transaction from RPC: {tx_hash}"))?;

    let versioned_transaction = transaction
        .transaction
        .transaction
        .decode()
        .ok_or_else(|| anyhow!("Failed to decode transaction from RPC response"))?;

    Ok(versioned_transaction)
}

async fn fetch_recent_sponsor_transactions(
    sponsor_pubkey: &solana_pubkey::Pubkey,
    limit: usize,
    rpc_client: &RpcClient,
) -> Result<Vec<VersionedTransaction>> {
    let signatures = rpc_client
        .get_signatures_for_address(sponsor_pubkey)
        .with_context(|| format!("Failed to fetch signatures for sponsor {sponsor_pubkey}"))?;

    let signatures_to_fetch = signatures.into_iter().take(limit).collect::<Vec<_>>();

    let mut transactions = Vec::new();
    for sig_info in signatures_to_fetch {
        let signature = Signature::from_str(&sig_info.signature)
            .with_context(|| format!("Invalid signature: {}", sig_info.signature))?;

        let config = RpcTransactionConfig {
            encoding: Some(UiTransactionEncoding::Base64),
            max_supported_transaction_version: Some(0),
            ..Default::default()
        };

        let transaction = rpc_client
            .get_transaction_with_config(&signature, config)
            .with_context(|| format!("Failed to fetch transaction {}", sig_info.signature))?;

        if let Some(versioned_transaction) = transaction.transaction.transaction.decode() {
            transactions.push(versioned_transaction);
        }
    }

    Ok(transactions)
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
) -> Result<Vec<&'a TransactionVariation>> {
    let mut matching_variations = Vec::new();

    let contextual_keys = compute_contextual_keys(&domain.domain).await?;

    for variation in &domain.tx_variations {
        let matches = match variation {
            TransactionVariation::V0(v0_variation) => {
                v0_variation.validate_transaction(transaction).is_ok()
            }
            TransactionVariation::V1(v1_variation) => v1_variation
                .validate_transaction(transaction, &contextual_keys, chain_index)
                .is_ok(),
        };

        if matches {
            matching_variations.push(variation);
        }
    }

    Ok(matching_variations)
}

async fn compute_contextual_keys(domain: &str) -> Result<ContextualDomainKeys> {
    let domain_registry = domain_registry::domain::Domain::new_checked(domain)
        .with_context(|| format!("Failed to derive domain registry key for domain: {domain}"))?
        .get_domain_record_address();

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
