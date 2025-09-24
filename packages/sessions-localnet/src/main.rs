use clap::{Arg, Command as ClapCommand};
use solana_derivation_path::DerivationPath;
use solana_keypair::Keypair;
use solana_rpc_client::rpc_client::RpcClient;
use solana_seed_derivable::SeedDerivable;
use solana_signer::Signer;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::{fs, thread, time::Duration};
use anyhow::{bail, Context, Result};
use fogo_paymaster::config::load_config;

fn main() -> Result<()> {
    let matches = ClapCommand::new("sessions-localnet")
        .about("Start a local validator with Sessions + paymaster")
        .arg(Arg::new("up").long("up").action(clap::ArgAction::SetTrue))
        .arg(Arg::new("config").long("config").num_args(1))
        .arg(Arg::new("mnemonic").long("mnemonic").num_args(1))
        .arg(Arg::new("airdrop_lamports").long("airdrop-lamports").num_args(1).default_value("1000000000"))
        .arg(Arg::new("in_container").long("in-container").action(clap::ArgAction::SetTrue))
        .get_matches();

    let airdrop_lamports = matches
        .get_one::<String>("airdrop_lamports")
        .unwrap()
        .parse::<u64>()
        .context("invalid --airdrop-lamports value")?;
    let is_in_container = matches.get_flag("in_container");
    let config_path = matches.get_one::<String>("config").map(|s| s.to_string());
    let mnemonic_path = matches
        .get_one::<String>("mnemonic")
        .map(|s| s.to_string());

    if is_in_container {
        let config_path = config_path.ok_or_else(|| anyhow::anyhow!("--config <path> required"))?;
        let mnemonic_path = mnemonic_path.ok_or_else(|| anyhow::anyhow!("--mnemonic <path> required"))?;
        run_in_container(&config_path, &mnemonic_path, airdrop_lamports)?;
    } else {
        let cfg = config_path.ok_or_else(|| anyhow::anyhow!("--config <path> required"))?;
        let mnm = mnemonic_path.ok_or_else(|| anyhow::anyhow!("--mnemonic <path> required"))?;
        run_wrapper(&cfg, &mnm, airdrop_lamports)?;
    }

    Ok(())
}

/// Copy the config and all files it references (mnemonic, etc.) into a staging directory
fn stage_config_and_dependencies(config_path: &str, mnemonic_path: &str, staging_dir: &Path) -> Result<(PathBuf, PathBuf)> {
    fs::create_dir_all(staging_dir).context("failed to create staging directory")?;

    let staged_config_path = staging_dir.join("paymaster.toml");
    fs::copy(config_path, &staged_config_path)
        .with_context(|| format!("failed to copy config to {:?}", staged_config_path))?;

    let staged_mnemonic_path = staging_dir.join("mnemonic");
    fs::copy(mnemonic_path, &staged_mnemonic_path)
        .with_context(|| format!("failed to copy mnemonic to {:?}", staged_mnemonic_path))?;

    println!("Staged config to {:?} and mnemonic to {:?}", staged_config_path, staged_mnemonic_path);

    Ok((staged_config_path, staged_mnemonic_path))
}


/// This runs in the user's host environment; it launches `docker run` after mounting
/// the config and mnemonic into the container.
fn run_wrapper(config_path: &str, mnemonic_path: &str, airdrop_lamports: u64) -> Result<()> {
    let config_abs = fs::canonicalize(config_path)
        .with_context(|| format!("failed to canonicalize config path {}", config_path))?.to_str().ok_or_else(|| anyhow::anyhow!("bad config path"))?.to_string();
    let mnemonic_abs = fs::canonicalize(mnemonic_path)
        .with_context(|| format!("failed to canonicalize mnemonic path {}", mnemonic_path))?.to_str().ok_or_else(|| anyhow::anyhow!("bad mnemonic path"))?.to_string();

    let staging_dir = std::env::temp_dir().join("sessions_localnet_workspace");
    let (staged_config_path, staged_mnemonic_path) = stage_config_and_dependencies(&config_abs, &mnemonic_abs, &staging_dir)?;

    // TODO: update this
    let image = "ghcr.io/your-gh-user/sessions-localnet:latest";

    let mount_spec = format!("{}:/workspace", staging_dir.display());

    let staged_config_path_str = staged_config_path.to_str().ok_or_else(|| anyhow::anyhow!("bad staged config path"))?;
    let staged_mnemonic_path_str = staged_mnemonic_path.to_str().ok_or_else(|| anyhow::anyhow!("bad staged mnemonic path"))?;
    let airdrop_lamports_str = airdrop_lamports.to_string();

    let args = vec![
        "run",
        "--rm",
        "-it",
        "-p",
        "8899:8899",
        "-p",
        "4000:4000",
        "-v",
        &mount_spec,
        image,
        "up",
        "--config",
        &staged_config_path_str,
        "--mnemonic",
        &staged_mnemonic_path_str,
        "--airdrop-lamports",
        &airdrop_lamports_str,
        "--in-container",
    ];

    let status = Command::new("docker")
        .args(args)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()
        .context("failed to run docker")?;

    if !status.success() {
        bail!("docker run failed");
    }
    Ok(())
}

pub const MAX_RETRIES: u32 = 30;

/// This runs inside the container and:
/// - starts solana-test-validator with the programs added
/// - waits for it to spin up
/// - reads config, derives sponsor keys and airdrops funds
/// - spawns the paymaster binary and waits
fn run_in_container(config_path: &str, mnemonic_path: &str, airdrop_lamports: u64) -> Result<()> {
    println!("(container) using config: {}", config_path);

    let sess_program_id = "SesswvJ7puvAgpyqp7N8HnjNnvpnS8447tKNF3sPgbC";
    let sessions_so = "./session_manager.so";

    let chain_id_program_id = "Cha1RcWkdcF1dmGuTui53JmSnVCacCc2Kx2SY7zSFhaN";
    let chain_id_so = "./chain_id.so";

    let domain_registry_program_id = "DomaLfEueNY6JrQSEFjuXeUDiohFmSrFeTNTPamS2yog";
    let domain_registry_so = "./domain_registry.so";

    let intent_transfer_program_id = "Xfry4dW9m42ncAqm8LyEnyS5V6xu5DSJTMRQLiGkARD";
    let intent_transfer_so = "./intent_transfer.so";

    let token_program_id = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    let token_so = "./spl_token.so";

    let associated_token_program_id = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
    let associated_token_so = "./spl_associated_token_account.so";

    for p in [sessions_so, chain_id_so, domain_registry_so, intent_transfer_so, token_so, associated_token_so] {
        if !Path::new(p).exists() {
            println!("Error: program file missing: {}", p);
        }
    }

    let mut validator = Command::new("solana-test-validator")
        .arg("--reset")
        .arg("--bpf-program")
        .arg(sess_program_id)
        .arg(sessions_so)
        .arg("--bpf-program")
        .arg(chain_id_program_id)
        .arg(chain_id_so)
        .arg("--bpf-program")
        .arg(domain_registry_program_id)
        .arg(domain_registry_so)
        .arg("--bpf-program")
        .arg(intent_transfer_program_id)
        .arg(intent_transfer_so)
        .arg("--bpf-program")
        .arg(token_program_id.to_string())
        .arg(token_so)
        .arg("--bpf-program")
        .arg(associated_token_program_id.to_string())
        .arg(associated_token_so)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .context("failed to spawn solana-test-validator")?;

    println!("Waiting for validator to start...");
    let config = load_config(config_path)?;
    // TODO: solana url should essentially be hardcoded here since localnet? maybe remove from the config
    let client = RpcClient::new(config.solana_url.clone());
    for i in 0..MAX_RETRIES {
        match client.get_health() {
            Ok(_) => break,
            Err(_) => {
                thread::sleep(Duration::from_secs(1));
                println!("... still waiting for validator to start (retry #{}/{})", i, MAX_RETRIES);
                if i == MAX_RETRIES - 1 {
                    let _ = validator.kill();
                    bail!("validator failed to start");
                }
            }
        }
    }
    println!("Validator started!");

    let mnemonic_path = Path::new(mnemonic_path);
    let mnemonic = fs::read_to_string(mnemonic_path)
        .with_context(|| format!("failed to read mnemonic file {:?}", mnemonic_path))?;

    for domain_cfg in config.domains.iter() {
        let sponsor = Keypair::from_seed_and_derivation_path(
            &solana_seed_phrase::generate_seed_from_seed_phrase_and_passphrase(
                &mnemonic, &domain_cfg.domain,
            ),
            Some(DerivationPath::new_bip44(Some(0), Some(0))),
        )
        .expect("Failed to derive keypair from mnemonic_file");

        let status = Command::new("solana")
            .arg("airdrop")
            .arg(airdrop_lamports.to_string())
            .arg(sponsor.pubkey().to_string())
            .arg("--url")
            .arg(&config.solana_url)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status()
            .context("solana airdrop failed")?;

        if !status.success() {
            println!("Warning: airdrop command returned non-zero status of {:?}", status);
        }
    }

    println!("Starting paymaster service...");
    let mut paymaster = Command::new("/usr/local/bin/fogo-paymaster")
        .arg("--config")
        .arg(config_path)
        .arg("--mnemonic")
        .arg(mnemonic_path)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .context("failed to spawn paymaster")?;

    println!("Started paymaster at address {}", config.listen_address);

    let paymaster_exit = paymaster.wait()?;
    println!("paymaster exited: {:?}", paymaster_exit);

    let _ = validator.kill();
    Ok(())
}
