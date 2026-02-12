use anchor_lang::{InstructionData, ToAccountMetas};
use anyhow::{Context, Result};
use clap::Parser;
use domain_registry::{
    accounts as domain_registry_accounts, instruction as domain_registry_instruction,
};
use fogo_paymaster::cli::NetworkEnvironment as CliNetworkEnvironment;
use fogo_paymaster::config_manager::config::Domain;
use fogo_paymaster::constraint::ParsedTransactionVariation;
use fogo_paymaster::db;
use fogo_sessions_sdk::domain_registry::get_domain_record_address;
use fogo_sessions_sdk::tollbooth::TOLLBOOTH_PROGRAM_ID;
use fogo_sessions_sdk::token::PROGRAM_SIGNER_SEED;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_commitment_config::CommitmentConfig;
use solana_keypair::{read_keypair_file, Keypair};
use solana_program::{instruction::Instruction, system_program};
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use solana_transaction::Transaction;
use std::collections::{btree_map::Entry, BTreeMap, BTreeSet};
use std::ops::Deref;
use std::str::FromStr;
use std::sync::OnceLock;

type DomainProgramSets = BTreeMap<String, BTreeSet<Pubkey>>;

const DOMAIN_RECORD_PROGRAM_ENTRY_BYTES: usize = 64;
const DOMAIN_REGISTRY_CONFIG_SEED: &[u8] = b"config";
const EXCLUDED_PROGRAM_IDS: [&str; 10] = [
    "11111111111111111111111111111111",
    "Ed25519SigVerify111111111111111111111111111",
    "SesswvJ7puvAgpyqp7N8HnjNnvpnS8447tKNF3sPgbC",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    "ComputeBudget111111111111111111111111111111",
    "Xfry4dW9m42ncAqm8LyEnyS5V6xu5DSJTMRQLiGkARD",
    "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    "KeccakSecp256k11111111111111111111111111111",
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
];

#[derive(Debug, Parser)]
#[command(version, about)]
struct Cli {
    /// Postgres connection string
    #[arg(short = 'd', long = "db-url", env = "DATABASE_URL")]
    db_url: String,

    /// Network environment to sync as
    #[arg(short, long, env = "NETWORK_ENVIRONMENT")]
    network_environment: CliNetworkEnvironment,

    /// Solana RPC HTTP URL
    #[arg(long, env = "RPC_URL_HTTP", default_value = "http://localhost:8899")]
    rpc_url_http: String,

    /// Path to authority keypair file used to update the on-chain domain registry
    #[arg(short, long, env = "AUTHORITY_KEYPAIR")]
    authority_keypair: String,

    /// Print intended actions without sending transactions
    #[arg(long, default_value_t = false)]
    dry_run: bool,
}

fn domain_registry_config_address() -> Pubkey {
    Pubkey::find_program_address(&[DOMAIN_REGISTRY_CONFIG_SEED], &domain_registry::ID).0
}

fn domain_program_signer_address(program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[PROGRAM_SIGNER_SEED], program_id).0
}

fn excluded_program_ids() -> &'static BTreeSet<Pubkey> {
    static IDS: OnceLock<BTreeSet<Pubkey>> = OnceLock::new();
    IDS.get_or_init(|| {
        EXCLUDED_PROGRAM_IDS
            .iter()
            .map(|id| Pubkey::from_str(id).expect("excluded program id must be valid"))
            .collect()
    })
}

fn filter_excluded_programs(programs: &mut BTreeSet<Pubkey>) {
    programs.retain(|program_id| !excluded_program_ids().contains(program_id));
}

fn parse_domain_record_programs(data: &[u8]) -> Result<BTreeSet<Pubkey>> {
    let mut chunks = data.chunks_exact(DOMAIN_RECORD_PROGRAM_ENTRY_BYTES);
    anyhow::ensure!(
        chunks.remainder().is_empty(),
        "invalid domain record length: {}",
        data.len()
    );

    let mut programs = BTreeSet::new();
    for chunk in chunks.by_ref() {
        let program_bytes: [u8; 32] = chunk[..32]
            .try_into()
            .map_err(|_| anyhow::anyhow!("failed to decode domain record program bytes"))?;
        programs.insert(Pubkey::new_from_array(program_bytes));
    }

    Ok(programs)
}

fn desired_programs_for_domain(domain: Domain) -> Result<(String, BTreeSet<Pubkey>)> {
    let domain_name = domain.domain;
    let parsed_variations = Domain::into_parsed_transaction_variations(
        domain.tx_variations,
        domain.enable_session_management,
    )?;

    let mut programs = BTreeSet::new();
    let mut requires_tollbooth = false;
    for variation in parsed_variations.values() {
        match variation {
            ParsedTransactionVariation::V0(v0) => {
                programs.extend(v0.whitelisted_programs.iter().copied());
            }
            ParsedTransactionVariation::V1(v1) => {
                if v1.paymaster_fee_lamports.unwrap_or(0) > 0 {
                    requires_tollbooth = true;
                }
                programs.extend(v1.instructions.iter().map(|ix| *ix.program.deref()));
            }
        }
    }
    filter_excluded_programs(&mut programs);
    if requires_tollbooth {
        programs.insert(TOLLBOOTH_PROGRAM_ID);
    } else {
        programs.remove(&TOLLBOOTH_PROGRAM_ID);
    }

    Ok((domain_name, programs))
}

fn desired_domain_program_sets(domains: Vec<Domain>) -> Result<DomainProgramSets> {
    let mut map = BTreeMap::new();
    for domain in domains {
        let (domain_name, programs) = desired_programs_for_domain(domain)?;
        match map.entry(domain_name) {
            Entry::Vacant(entry) => {
                entry.insert(programs);
            }
            Entry::Occupied(mut entry) => {
                entry.get_mut().extend(programs);
            }
        }
    }
    Ok(map)
}

fn build_initialize_instruction(authority: Pubkey) -> Instruction {
    Instruction {
        program_id: domain_registry::ID,
        accounts: domain_registry_accounts::Initialize {
            authority,
            config: domain_registry_config_address(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: domain_registry_instruction::Initialize {}.data(),
    }
}

fn build_add_program_instruction(
    authority: Pubkey,
    domain: &str,
    program_id: Pubkey,
) -> Instruction {
    Instruction {
        program_id: domain_registry::ID,
        accounts: domain_registry_accounts::AddProgram {
            authority,
            config: domain_registry_config_address(),
            domain_record: get_domain_record_address(domain),
            program_id,
            signer_pda: domain_program_signer_address(&program_id),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: domain_registry_instruction::AddProgram {
            domain: domain.to_string(),
        }
        .data(),
    }
}

fn build_remove_program_instruction(
    authority: Pubkey,
    domain: &str,
    program_id: Pubkey,
) -> Instruction {
    Instruction {
        program_id: domain_registry::ID,
        accounts: domain_registry_accounts::RemoveProgram {
            authority,
            config: domain_registry_config_address(),
            domain_record: get_domain_record_address(domain),
            program_id,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: domain_registry_instruction::RemoveProgram {
            domain: domain.to_string(),
        }
        .data(),
    }
}

async fn send_instruction(
    rpc: &RpcClient,
    authority: &Keypair,
    instruction: Instruction,
) -> Result<()> {
    let recent_blockhash = rpc.get_latest_blockhash().await?;
    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&authority.pubkey()),
        &[authority],
        recent_blockhash,
    );
    let signature = rpc.send_and_confirm_transaction(&tx).await?;
    println!("Submitted tx: {signature}");
    Ok(())
}

async fn ensure_registry_initialized(
    rpc: &RpcClient,
    authority: &Keypair,
    dry_run: bool,
) -> Result<()> {
    let config = domain_registry_config_address();
    let config_account = rpc
        .get_account_with_commitment(&config, CommitmentConfig::confirmed())
        .await?
        .value;

    if config_account.is_some() {
        return Ok(());
    }

    if dry_run {
        println!("Domain registry config is missing. Would initialize (dry-run).");
        return Ok(());
    }

    println!("Domain registry config is missing. Initializing...");
    send_instruction(
        rpc,
        authority,
        build_initialize_instruction(authority.pubkey()),
    )
    .await
}

async fn current_domain_programs(rpc: &RpcClient, domain: &str) -> Result<BTreeSet<Pubkey>> {
    let domain_record = get_domain_record_address(domain);
    let account = rpc
        .get_account_with_commitment(&domain_record, CommitmentConfig::confirmed())
        .await?
        .value;

    match account {
        Some(acc) => parse_domain_record_programs(&acc.data)
            .with_context(|| format!("failed parsing domain record for domain {domain}")),
        None => Ok(BTreeSet::new()),
    }
}

async fn sync_domain(
    rpc: &RpcClient,
    authority: &Keypair,
    domain: &str,
    desired_programs: &BTreeSet<Pubkey>,
    dry_run: bool,
) -> Result<()> {
    let current_programs = current_domain_programs(rpc, domain).await?;

    let to_add: Vec<Pubkey> = desired_programs
        .difference(&current_programs)
        .copied()
        .collect();
    let to_remove: Vec<Pubkey> = current_programs
        .difference(desired_programs)
        .copied()
        .collect();

    if to_add.is_empty() && to_remove.is_empty() {
        // println!("Domain {domain}: already in sync");
        return Ok(());
    }

    println!(
        "Domain {domain}: {} program(s) to add, {} program(s) to remove",
        to_add.len(),
        to_remove.len()
    );

    for program_id in to_add {
        if dry_run {
            println!("Domain {domain}: would add program {program_id} (dry-run)");
        } else {
            println!("Domain {domain}: adding program {program_id}");
            let instruction = build_add_program_instruction(authority.pubkey(), domain, program_id);
            send_instruction(rpc, authority, instruction).await?;
        }
    }

    for program_id in to_remove {
        if dry_run {
            println!("Domain {domain}: would remove program {program_id} (dry-run)");
        } else {
            println!("Domain {domain}: removing program {program_id}");
            let instruction =
                build_remove_program_instruction(authority.pubkey(), domain, program_id);
            send_instruction(rpc, authority, instruction).await?;
        }
    }

    Ok(())
}

async fn run(cli: Cli) -> Result<()> {
    db::pool::init_db_connection(&cli.db_url).await?;

    let authority = read_keypair_file(&cli.authority_keypair)
        .map_err(|e| anyhow::anyhow!(e.to_string()))
        .with_context(|| {
            format!(
                "failed to read authority keypair file at {}",
                cli.authority_keypair
            )
        })?;

    let rpc = RpcClient::new_with_commitment(cli.rpc_url_http, CommitmentConfig::confirmed());
    ensure_registry_initialized(&rpc, &authority, cli.dry_run).await?;

    let config = db::config::load_config(cli.network_environment.into()).await?;
    println!("Loaded {} domains from database", config.domains.len());
    let desired = desired_domain_program_sets(config.domains)?;

    for (domain, desired_programs) in desired {
        sync_domain(&rpc, &authority, &domain, &desired_programs, cli.dry_run).await?;
    }

    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    let cli = Cli::parse();
    run(cli).await
}
