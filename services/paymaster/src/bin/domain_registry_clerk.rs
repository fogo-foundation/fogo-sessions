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
use fogo_sessions_sdk::intent_transfer::INTENT_TRANSFER_PROGRAM_ID;
use fogo_sessions_sdk::session::SESSION_MANAGER_ID;
use fogo_sessions_sdk::token::PROGRAM_SIGNER_SEED;
use fogo_sessions_sdk::tollbooth::TOLLBOOTH_PROGRAM_ID;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_commitment_config::CommitmentConfig;
use solana_keypair::{read_keypair_file, Keypair};
use solana_program::{hash::hashv, instruction::Instruction};
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use solana_transaction::Transaction;
use std::collections::{BTreeMap, BTreeSet};
use std::ops::Deref;
use std::str::FromStr;
use std::time::Duration;
use tokio::time::sleep;
use tollbooth::get_domain_toll_recipient_address;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

type DesiredDomainStates = BTreeMap<String, DesiredDomainState>;

const EXCLUDED_PROGRAM_IDS: [Pubkey; 10] = [
    solana_sdk_ids::system_program::ID,
    solana_sdk_ids::ed25519_program::ID,
    solana_sdk_ids::secp256k1_program::ID,
    solana_sdk_ids::compute_budget::ID,
    SESSION_MANAGER_ID,
    INTENT_TRANSFER_PROGRAM_ID,
    spl_token::id(),
    spl_associated_token_account::id(),
    spl_memo::id(),
    mpl_token_metadata::ID,
];

#[derive(Debug, Parser)]
#[command(version, about)]
struct Cli {
    /// Postgres connection string
    #[arg(short, long, env = "DATABASE_URL")]
    db_url: String,

    /// Network environment to sync
    #[arg(short, long, env = "NETWORK_ENVIRONMENT")]
    network_environment: CliNetworkEnvironment,

    /// Solana RPC HTTP URL
    #[arg(long, env = "RPC_URL_HTTP", default_value = "http://localhost:8899")]
    rpc_url_http: String,

    /// Path to keypair file used to send transactions, must be the authority of the domain registry
    #[arg(short, long, env = "KEYPAIR")]
    keypair: String,

    /// Mint address of the tokens that the paymaster accepts for fee payment
    #[arg(short, long, env = "FEE_TOKENS", value_parser = Pubkey::from_str, value_delimiter = ',')]
    fee_tokens: Vec<Pubkey>,

    /// Print intended actions without sending transactions
    #[arg(long, default_value_t = false)]
    dry_run: bool,

    /// Heartbeat interval in seconds between sync passes
    #[arg(long, env = "HEARTBEAT_SECONDS", default_value = "30", value_parser = clap::value_parser!(u64).range(1..))]
    heartbeat_seconds: u64,
}

#[derive(Debug, Clone)]
struct DesiredDomainState {
    programs: BTreeSet<Pubkey>,
    requires_fee_receiver_initialized: bool,
}

fn domain_program_signer_address(program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[PROGRAM_SIGNER_SEED], program_id).0
}

fn domain_registry_config_address() -> Pubkey {
    Pubkey::find_program_address(&[domain_registry::state::CONFIG_SEED], &domain_registry::ID).0
}

fn filter_excluded_programs(programs: &mut BTreeSet<Pubkey>) {
    programs.retain(|program_id| !EXCLUDED_PROGRAM_IDS.contains(program_id));
}

fn parse_domain_record_programs(data: &[u8]) -> BTreeSet<Pubkey> {
    let programs = bytemuck::cast_slice(data)
        .iter()
        .map(|slice: &[u8; 64]| {
            Pubkey::new_from_array(
                slice[..32]
                    .try_into()
                    .expect("this length of this slice must be 32"),
            )
        })
        .collect();
    programs
}

fn desired_programs_for_domain(domain: Domain) -> Result<(String, DesiredDomainState)> {
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
                if v1.paymaster_fee_lamports.map(|p| p > 0).unwrap_or(false) {
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

    Ok((
        domain_name,
        DesiredDomainState {
            programs,
            requires_fee_receiver_initialized: requires_tollbooth,
        },
    ))
}

fn desired_domain_states(domains: Vec<Domain>) -> Result<DesiredDomainStates> {
    domains
        .into_iter()
        .map(desired_programs_for_domain)
        .collect::<Result<BTreeMap<String, DesiredDomainState>>>()
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
            system_program: solana_sdk_ids::system_program::ID,
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
            system_program: solana_sdk_ids::system_program::ID,
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
    dry_run: bool,
) -> Result<()> {
    if dry_run {
        return Ok(());
    }

    let recent_blockhash = rpc.get_latest_blockhash().await?;
    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&authority.pubkey()),
        &[authority],
        recent_blockhash,
    );
    let signature = rpc.send_and_confirm_transaction(&tx).await?;
    tracing::info!("Submitted tx: {signature}");
    Ok(())
}

async fn ensure_fee_receiver_token_accounts(
    rpc: &RpcClient,
    keypair: &Keypair,
    domain: &str,
    fee_tokens: &[Pubkey],
    dry_run: bool,
) -> Result<()> {
    if fee_tokens.is_empty() {
        tracing::info!(
            "Domain {domain}: paymaster fee configured but no --fee-tokens provided, skipping fee receiver token account initialization"
        );
        return Ok(());
    }

    let domain_hash = hashv(&[domain.as_bytes()]);
    let recipient = get_domain_toll_recipient_address(&domain_hash.to_bytes());
    for mint in fee_tokens {
        let ata = spl_associated_token_account::get_associated_token_address(&recipient, mint);
        let ata_exists = rpc
            .get_account_with_commitment(&ata, CommitmentConfig::confirmed())
            .await?
            .value
            .is_some();
        if ata_exists {
            continue;
        }

        tracing::info!("Domain {domain}: initializing fee receiver ATA {ata} for mint {mint}");
        let instruction =
            spl_associated_token_account::instruction::create_associated_token_account_idempotent(
                &keypair.pubkey(),
                &recipient,
                mint,
                &spl_token::id(),
            );
        send_instruction(rpc, keypair, instruction, dry_run).await?;
    }

    Ok(())
}

async fn current_domain_programs(rpc: &RpcClient, domain: &str) -> Result<BTreeSet<Pubkey>> {
    let domain_record = get_domain_record_address(domain);
    let account = rpc
        .get_account_with_commitment(&domain_record, CommitmentConfig::confirmed())
        .await?
        .value;

    match account {
        Some(acc) => Ok(parse_domain_record_programs(&acc.data)),
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
        return Ok(());
    }

    tracing::info!(
        "Domain {domain}: {} program(s) to add, {} program(s) to remove",
        to_add.len(),
        to_remove.len()
    );

    for program_id in to_add {
        tracing::info!("Domain {domain}: adding program {program_id}");
        let instruction = build_add_program_instruction(authority.pubkey(), domain, program_id);
        send_instruction(rpc, authority, instruction, dry_run).await?;
    }

    for program_id in to_remove {
        tracing::info!("Domain {domain}: removing program {program_id}");
        let instruction = build_remove_program_instruction(authority.pubkey(), domain, program_id);
        send_instruction(rpc, authority, instruction, dry_run).await?;
    }

    Ok(())
}

async fn sync_once(cli: &Cli, rpc: &RpcClient, authority: &Keypair) -> Result<()> {
    let config = db::config::load_config(cli.network_environment.into()).await?;
    let desired = desired_domain_states(config.domains)?;

    for (domain, desired_state) in desired {
        sync_domain(
            rpc,
            authority,
            &domain,
            &desired_state.programs,
            cli.dry_run,
        )
        .await?;
        if desired_state.requires_fee_receiver_initialized {
            ensure_fee_receiver_token_accounts(
                rpc,
                authority,
                &domain,
                &cli.fee_tokens,
                cli.dry_run,
            )
            .await?;
        }
    }

    Ok(())
}

async fn run(cli: Cli) -> Result<()> {
    db::pool::init_db_connection(&cli.db_url).await?;

    let authority = read_keypair_file(&cli.keypair)
        .map_err(|e| anyhow::anyhow!(e.to_string()))
        .with_context(|| format!("failed to read authority keypair file at {}", cli.keypair))?;

    let rpc =
        RpcClient::new_with_commitment(cli.rpc_url_http.clone(), CommitmentConfig::confirmed());
    let heartbeat = Duration::from_secs(cli.heartbeat_seconds);

    tracing::info!(
        "Starting domain registry clerk loop (heartbeat={}s, dry_run={})",
        cli.heartbeat_seconds,
        cli.dry_run
    );

    loop {
        if let Err(err) = sync_once(&cli, &rpc, &authority).await {
            tracing::error!("Domain registry clerk sync failed: {err:#}");
        }

        tracing::info!("Heartbeat: next sync in {}s", cli.heartbeat_seconds);
        sleep(heartbeat).await;
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer().with_target(false))
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".parse().expect("info is a valid env filter")),
        )
        .init();
    let cli = Cli::parse();
    run(cli).await
}
