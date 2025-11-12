mod config;
mod dispatcher;
mod generator;
mod metrics;
mod reporter;

use anyhow::Result;
use clap::Parser;
use config::RuntimeConfig;
use dispatcher::LoadTestDispatcher;
use metrics::LoadTestMetrics;
use reporter::generate_report;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;

use crate::config::FileConfig;

#[derive(Parser, Debug)]
#[command(name = "paymaster-load-test")]
#[command(about = "Load testing tool for paymaster", long_about = None)]
struct Args {
    /// Path to TOML configuration file
    #[arg(
        short,
        long,
        default_value = "scripts/paymaster-load-test/load-test-config.toml"
    )]
    config: String,

    /// Test duration in seconds
    #[arg(short, long, default_value = "60")]
    duration: u64,

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

    let config = RuntimeConfig::new(
        args.duration,
        args.rate,
        file_config.validity,
        file_config.external,
    )?;

    tracing::info!("Configuration loaded successfully");
    tracing::info!(" - Paymaster: {}", config.external.paymaster_endpoint);
    tracing::info!(" - RPC: {}", config.external.rpc_url);
    tracing::info!(" - Domain: {}", config.external.domain);
    tracing::info!(" - Duration: {}s", config.duration_secs);
    tracing::info!(" - Target Rate: {} req/s", config.request_rps);
    tracing::info!(
        " - Valid Rate: {:.1}%",
        config.validity_distribution.valid_rate * 100.0
    );

    let metrics = Arc::new(LoadTestMetrics::new());

    let dispatcher = Arc::new(LoadTestDispatcher::new(config.clone(), metrics.clone()).await?);

    tracing::info!("Starting load test...");
    let start_time = std::time::Instant::now();

    let test_handle = tokio::spawn({
        let dispatcher = dispatcher.clone();
        let duration = Duration::from_secs(config.duration_secs);
        async move { dispatcher.run(duration).await }
    });

    let monitor_handle = tokio::spawn({
        let metrics = metrics.clone();
        let duration = config.duration_secs;
        async move { monitor_progress(metrics, duration).await }
    });

    test_handle.await.expect("test task panicked")?;
    monitor_handle.abort();

    let elapsed = start_time.elapsed();

    tracing::info!("Load test completed in {:.2}s", elapsed.as_secs_f64());

    generate_report(&config, &metrics, elapsed).await?;

    Ok(())
}

pub const MONITOR_INTERVAL: u64 = 5;

async fn monitor_progress(metrics: Arc<LoadTestMetrics>, duration_secs: u64) {
    let mut last_requests = 0;
    let interval = Duration::from_secs(MONITOR_INTERVAL);
    // we round up the number of intervals to make sure we get total coverage of the test duration
    let total_intervals = duration_secs.div_ceil(MONITOR_INTERVAL);

    let mut success_rate_last = None;

    for i in 0..total_intervals {
        sleep(interval).await;

        let current_requests = metrics.get_requests_sent();
        let requests_delta = current_requests.saturating_sub(last_requests);
        let current_rate = requests_delta as f64 / interval.as_secs_f64();

        let success_rate = metrics.success_rate();

        let success_delta = match (success_rate_last, success_rate) {
            (Some(last), Some(current)) => Some(current - last),
            _ => None,
        };

        let success_display = match success_rate {
            Some(rate) => {
                let delta_display = match success_delta {
                    Some(delta) => {
                        let sign = if delta >= 0.0 { "+" } else { "" };
                        format!(" ({}{:.1}%)", sign, delta * 100.0)
                    }
                    None => String::new(),
                };
                format!(" | Success: {:.1}%{}", rate * 100.0, delta_display)
            }
            None => String::new(),
        };

        tracing::info!(
            "[{:3}s] Requests: {} (+{} @ {:.1} req/s){}",
            (i + 1) * 5,
            current_requests,
            requests_delta,
            current_rate,
            success_display
        );

        last_requests = current_requests;
        success_rate_last = success_rate;
    }
}
