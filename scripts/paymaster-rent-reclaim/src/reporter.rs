use crate::config::RuntimeConfig;
use crate::metrics::{compute_latency_percentiles, Metrics};
use anyhow::Result;
use std::time::Duration;

const LATENCY_QUANTILES: &[f64] = &[0.50, 0.90, 0.95, 0.99];

/// Generate and display the load test report
pub async fn generate_report(
    config: &RuntimeConfig,
    metrics: &Metrics,
    elapsed: Duration,
) -> Result<()> {
    println!("\n{}", "=".repeat(80));
    println!("Load Test Results");
    println!("{}", "=".repeat(80));

    // Test parameters
    println!("\nTest Parameters:");
    println!("  Target Rate:     {} req/s", config.request_rps);
    println!("\nTarget Configuration:");
    println!("  Paymaster:       {}", config.external.paymaster_endpoint);
    println!("  RPC:             {}", config.external.rpc_url);
    println!("  Domain:          {}", config.external.domain);

    // Global results
    println!("\n{}", "-".repeat(80));
    println!("Overall Results:");
    println!("{}", "-".repeat(80));

    let total_sent = metrics.get_requests_sent();
    let total_succeeded = metrics.get_requests_succeeded();
    let total_failed = metrics.get_requests_failed();
    let success_rate = metrics.success_rate();
    let achieved_rate = total_sent as f64 / elapsed.as_secs_f64();

    println!("  Total Requests:  {total_sent}");
    if let Some(success_rate) = success_rate {
        println!(
            "  Succeeded:       {} ({:.1}%)",
            total_succeeded,
            success_rate * 100.0
        );
        println!(
            "  Failed:          {} ({:.1}%)",
            total_failed,
            (1.0 - success_rate) * 100.0
        );
    } else {
        println!("  No requests were resolved.");
    }
    println!("  Achieved Rate:   {achieved_rate:.2} req/s");
    println!("  Actual Duration: {:.2}s", elapsed.as_secs_f64());

    // Latency statistics
    println!("\n{}", "-".repeat(80));
    println!("Latency (End-to-End):");
    println!("{}", "-".repeat(80));

    let latency = compute_latency_percentiles(&metrics.e2e_latency, LATENCY_QUANTILES);
    println!("  Mean:  {:.2}ms", latency.mean_ms());
    println!("  Min:   {:.2}ms", latency.min_ms());
    for (quantile, duration) in &latency.percentiles {
        println!(
            "  p{:<2}:   {:.2}ms",
            (quantile * 100.0) as u32,
            duration.as_micros() as f64 / 1000.0
        );
    }
    println!("  Max:   {:.2}ms", latency.max_ms());
    println!("\n{}", "=".repeat(80));

    Ok(())
}
