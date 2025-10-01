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
    config::{load_config, Config, Domain},
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
            let config = load_config(&config).with_context(|| format!("Failed to load config from {config}"))?;
            let tx = match (transaction_hash, transaction) {
                (Some(hash), _) => fetch_transaction_from_rpc(&hash, &config.solana_url).await?,
                (None, Some(tx)) => parse_transaction_from_base64(&tx)?,
                (None, None) => {
                    return Err(anyhow!(
                        "Either --transaction-hash or --transaction must be provided"
                    ));
                }
            };

            validate_transaction(&tx, &config, domain).await?;
        }
    }

    Ok(())
}

async fn validate_transaction(
    transaction: &VersionedTransaction,
    config: &Config,
    domain_name: Option<String>,
) -> Result<()> {
    let chain_index = ChainIndex {
        rpc: RpcClient::new(config.solana_url.to_string()),
        lookup_table_cache: DashMap::new(),
    };

    let domains = if let Some(ref domain_name_specified) = domain_name {
        vec![config.domains.iter().find(|d| d.domain == *domain_name_specified).ok_or_else(|| {
            anyhow!("Domain '{domain_name_specified}' not found in config")
        })?]
    } else {
        config.domains.iter().collect()
    };
    let mut any_matches = false;
    for domain in domains {
        let matching_variations = check_transaction_variations(
            transaction,
            &domain.tx_variations,
            domain,
            &chain_index,
        )
        .await?;

        if !matching_variations.is_empty() {
            any_matches = true;
            println!(
                "✅ Transaction matches variations for domain '{}':",
                domain.domain
            );
            for variation_name in matching_variations {
                println!("  - {variation_name}");
            }
            println!();
        }
    }

    if !any_matches {
        let error_message = match domain_name {
            Some(name) => format!("❌ Transaction does not match any variations for domain '{name}'"),
            None => "❌ Transaction does not match any variations for any configured domain".to_string(),
        };
        println!("{error_message}");
        std::process::exit(1);
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

async fn check_transaction_variations(
    transaction: &VersionedTransaction,
    variations: &[TransactionVariation],
    domain: &Domain,
    chain_index: &ChainIndex,
) -> Result<Vec<String>> {
    let mut matching_variations = Vec::new();

    let contextual_keys = compute_contextual_keys(&domain.domain).await?;

    for variation in variations {
        let variation_name = variation.name().to_string();

        let matches = match variation {
            TransactionVariation::V0(v0_variation) => {
                v0_variation.validate_transaction(transaction).is_ok()
            }
            TransactionVariation::V1(v1_variation) => {
                v1_variation
                    .validate_transaction(transaction, &contextual_keys, chain_index)
                    .is_ok()
            }
        };

        if matches {
            matching_variations.push(variation_name);
        }
    }

    Ok(matching_variations)
}

async fn compute_contextual_keys(
    domain: &str,
) -> Result<ContextualDomainKeys> {
    let domain_registry = domain_registry::domain::Domain::new_checked(domain)
        .with_context(|| format!("Failed to derive domain registry key for domain: {domain}"))?
        .get_domain_record_address();

    let url = format!("https://paymaster.fogo.io/api/sponsor_pubkey?domain={domain}");
    let client = reqwest::Client::new();
    let response = client.get(&url).send().await.with_context(|| {
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
