use anyhow::{anyhow, Context, Result};
use base64::prelude::*;
use clap::{Parser, Subcommand};
use dashmap::DashMap;
use solana_client::{rpc_client::RpcClient, rpc_config::RpcTransactionConfig};
use solana_derivation_path::DerivationPath;
use solana_keypair::Keypair;
use solana_seed_derivable::SeedDerivable;
use solana_signature::Signature;
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_status_client_types::UiTransactionEncoding;
use std::{collections::HashMap, fs, str::FromStr, sync::Arc};

use fogo_paymaster::{
    api::ChainIndex,
    config::{load_config, Config, Domain},
    constraint::{ContextualDomainKeys, TransactionVariation},
};

#[derive(Debug)]
enum TransactionInput {
    Serialized(String),
    Hash(String),
}

struct ValidationCache {
    contextual_keys: HashMap<String, ContextualDomainKeys>,
    chain_index: Arc<ChainIndex>,
}

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

        /// Base64 encoded serialized transaction
        #[arg(short, long, conflicts_with = "transaction_hash")]
        transaction: Option<String>,

        /// Transaction hash to fetch from RPC
        #[arg(long, conflicts_with = "transaction")]
        transaction_hash: Option<String>,

        /// Manually compute sponsor key from mnemonic instead of fetching from API
        #[arg(long, default_value = "false")]
        manually_compute_sponsor: bool,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Validate {
            config,
            domain,
            transaction,
            transaction_hash,
            manually_compute_sponsor,
        } => {
            // Ensure exactly one of transaction or transaction_hash is provided
            match (transaction, transaction_hash) {
                (Some(tx), None) => {
                    validate_transaction(
                        config,
                        domain,
                        TransactionInput::Serialized(tx),
                        manually_compute_sponsor,
                    )
                    .await?;
                }
                (None, Some(hash)) => {
                    validate_transaction(
                        config,
                        domain,
                        TransactionInput::Hash(hash),
                        manually_compute_sponsor,
                    )
                    .await?;
                }
                (None, None) => {
                    return Err(anyhow!(
                        "Either --transaction or --transaction-hash must be provided"
                    ));
                }
                (Some(_), Some(_)) => {
                    return Err(anyhow!(
                        "Cannot provide both --transaction and --transaction-hash"
                    ));
                }
            }
        }
    }

    Ok(())
}

async fn validate_transaction(
    config_path: String,
    domain_name: Option<String>,
    transaction_input: TransactionInput,
    manually_compute_sponsor: bool,
) -> Result<()> {
    let config = load_config(&config_path)
        .with_context(|| format!("Failed to load config from {config_path}"))?;

    let transaction = match transaction_input {
        TransactionInput::Serialized(encoded_tx) => parse_transaction_from_base64(&encoded_tx)?,
        TransactionInput::Hash(tx_hash) => {
            fetch_transaction_from_rpc(&tx_hash, &config.solana_url).await?
        }
    };

    let mut cache = ValidationCache {
        contextual_keys: HashMap::new(),
        chain_index: Arc::new(ChainIndex {
            rpc: RpcClient::new(config.solana_url.to_string()),
            lookup_table_cache: DashMap::new(),
        }),
    };

    if let Some(domain_name) = domain_name {
        let domain = find_domain(&config, &domain_name)
            .ok_or_else(|| anyhow!("Domain '{}' not found in config", domain_name))?;

        let matching_variations = check_transaction_variations(
            &transaction,
            &domain.tx_variations,
            &config,
            domain,
            &mut cache,
            manually_compute_sponsor,
        )
        .await?;

        if matching_variations.is_empty() {
            println!("❌ Transaction does not match any variations for domain '{domain_name}'");
            std::process::exit(1);
        } else {
            println!("✅ Transaction matches the following variations for domain '{domain_name}':");
            for variation_name in matching_variations {
                println!("  - {variation_name}");
            }
        }
    } else {
        let mut any_matches = false;

        for domain in &config.domains {
            let matching_variations = check_transaction_variations(
                &transaction,
                &domain.tx_variations,
                &config,
                domain,
                &mut cache,
                manually_compute_sponsor,
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
            println!("❌ Transaction does not match any variations for any configured domain");
            std::process::exit(1);
        }
    }

    Ok(())
}

fn find_domain<'a>(config: &'a Config, domain_name: &str) -> Option<&'a Domain> {
    config.domains.iter().find(|d| d.domain == domain_name)
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
    config: &Config,
    domain: &Domain,
    cache: &mut ValidationCache,
    manually_compute_sponsor: bool,
) -> Result<Vec<String>> {
    let mut matching_variations = Vec::new();

    for variation in variations {
        let variation_name = variation.name().to_string();

        let matches = match variation {
            TransactionVariation::V0(v0_variation) => {
                v0_variation.validate_transaction(transaction).is_ok()
            }
            TransactionVariation::V1(v1_variation) => {
                let contextual_keys = get_contextual_keys(
                    &mut cache.contextual_keys,
                    &config.mnemonic_file,
                    &domain.domain,
                    manually_compute_sponsor,
                )
                .await?;

                v1_variation
                    .validate_transaction(transaction, contextual_keys, &cache.chain_index)
                    .is_ok()
            }
        };

        if matches {
            matching_variations.push(variation_name);
        }
    }

    Ok(matching_variations)
}

async fn get_contextual_keys<'a>(
    cache: &'a mut HashMap<String, ContextualDomainKeys>,
    mnemonic_file: &str,
    domain: &str,
    manually_compute_sponsor: bool,
) -> Result<&'a ContextualDomainKeys> {
    if !cache.contains_key(domain) {
        let contextual_keys =
            compute_contextual_keys(mnemonic_file, domain, manually_compute_sponsor).await?;
        cache.insert(domain.to_string(), contextual_keys);
    }
    Ok(cache.get(domain).unwrap())
}

async fn compute_contextual_keys(
    mnemonic_file: &str,
    domain: &str,
    manually_compute_sponsor: bool,
) -> Result<ContextualDomainKeys> {
    let domain_registry = domain_registry::domain::Domain::new_checked(domain)
        .with_context(|| format!("Failed to derive domain registry key for domain: {domain}"))?
        .get_domain_record_address();

    let sponsor = if manually_compute_sponsor {
        let mnemonic = fs::read_to_string(mnemonic_file)
            .with_context(|| format!("Failed to read mnemonic file: {mnemonic_file}"))?
            .trim()
            .to_string();

        let sponsor_keypair = Keypair::from_seed_and_derivation_path(
            &solana_seed_phrase::generate_seed_from_seed_phrase_and_passphrase(&mnemonic, domain),
            Some(DerivationPath::new_bip44(Some(0), Some(0))),
        )
        .map_err(|e| {
            anyhow!(
                "Failed to derive keypair from mnemonic for domain {}: {}",
                domain,
                e
            )
        })?;

        sponsor_keypair.pubkey()
    } else {
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

        sponsor
    };

    Ok(ContextualDomainKeys {
        domain_registry,
        sponsor,
    })
}
