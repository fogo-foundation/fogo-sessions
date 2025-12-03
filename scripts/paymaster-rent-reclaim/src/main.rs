mod config;
mod dispatcher;
mod generator;
mod metrics;
mod reporter;

use anyhow::Result;
use clap::Parser;
use config::RuntimeConfig;
use dispatcher::LoadTestDispatcher;
use metrics::Metrics;
use reporter::generate_report;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::config::FileConfig;

#[derive(Parser, Debug)]
#[command(name = "paymaster-rent-reclaim")]
#[command(about = "Load testing tool for paymaster", long_about = None)]
struct Args {
    /// Path to TOML configuration file
    #[arg(
        short,
        long,
        default_value = "scripts/paymaster-rent-reclaim/rent-reclaim-config.toml"
    )]
    config: String,

    /// Target request rate per second
    #[arg(short, long, default_value = "10")]
    rate: u64,

    #[arg(short, long)]
    verbose: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    let log_level = if args.verbose { "debug" } else { "info" };
    tracing_subscriber::fmt()
        .with_env_filter(log_level)
        .with_target(false)
        .init();

    tracing::info!("Starting Fogo Paymaster Load Test");

    let file_config = FileConfig::from_file(&args.config)?;

    let config = RuntimeConfig::new(args.rate, file_config.external)?;

    tracing::info!("Configuration loaded successfully");
    tracing::info!(" - Paymaster: {}", config.external.paymaster_endpoint);
    tracing::info!(" - RPC: {}", config.external.rpc_url);
    tracing::info!(" - Domain: {}", config.external.domain);
    tracing::info!(" - Target Rate: {} req/s", config.request_rps);

    let metrics = Arc::new(RwLock::new(Metrics::default()));

    let dispatcher = Arc::new(LoadTestDispatcher::new(config.clone(), metrics.clone()).await?);

    tracing::info!("Starting load test...");
    let start_time = std::time::Instant::now();

    let test_handle = tokio::spawn({
        let dispatcher = dispatcher.clone();
        async move { dispatcher.run().await }
    });

    test_handle.await.expect("test task panicked")?;

    let elapsed = start_time.elapsed();

    tracing::info!("Load test completed in {:.2}s", elapsed.as_secs_f64());

    generate_report(&config, &metrics.read().await.clone(), elapsed).await?;

    Ok(())
}
