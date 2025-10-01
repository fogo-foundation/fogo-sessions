use anyhow::{anyhow, Context, Result};
use base64::prelude::*;
use clap::{Parser, Subcommand};
use dashmap::DashMap;
use solana_client::{rpc_client::RpcClient, rpc_config::RpcTransactionConfig};
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_status_client_types::UiTransactionEncoding;
use std::str::FromStr;

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
        #[arg(long, conflicts_with = "transaction")]
        transaction_hash: Option<String>,

        /// Base64 encoded serialized transaction
        #[arg(short, long, conflicts_with = "transaction_hash")]
        transaction: Option<String>,
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
            let tx = match (transaction_hash, transaction) {
                (Some(hash), _) => fetch_transaction_from_rpc(&hash, &config.solana_url).await?,
                (None, Some(tx)) => parse_transaction_from_base64(&tx)?,
                (None, None) => {
                    return Err(anyhow!(
                        "Either --transaction-hash or --transaction must be provided"
                    ));
                }
            };
            let chain_index = ChainIndex {
                rpc: RpcClient::new(config.solana_url),
                lookup_table_cache: DashMap::new(),
            };

            let mut successful_validations = Vec::new();
            for domain in domains {
                successful_validations
                    .extend(get_matching_variations(&tx, domain, &chain_index).await?);
            }

            if successful_validations.is_empty() {
                if let Some(ref domain_name) = domain {
                    println!(
                        "❌ Transaction does not match any variations for domain '{domain_name}'"
                    );
                } else {
                    println!(
                        "❌ Transaction does not match any variations for any configured domain"
                    );
                }
            } else {
                println!("✅ Transaction matches the following variations:");
                for (domain_name, variation) in successful_validations {
                    println!(" - Domain: {domain_name}, Variation: {}", variation.name());
                }
            }
        }
    }

    Ok(())
}

async fn fetch_transaction_from_rpc(tx_hash: &str, rpc_url: &str) -> Result<VersionedTransaction> {
    let signature = Signature::from_str(tx_hash)
        .with_context(|| format!("Invalid transaction signature: {tx_hash}"))?;

    let rpc_client = RpcClient::new(rpc_url.to_string());

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
) -> Result<Vec<(String, &'a TransactionVariation)>> {
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
            matching_variations.push((domain.domain.clone(), variation));
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
