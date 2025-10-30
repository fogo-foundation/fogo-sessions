use crate::config::RuntimeConfig;
use crate::metrics::{compute_latency_percentiles, LoadTestMetrics};
use anyhow::Result;
use std::time::Duration;

const LATENCY_QUANTILES: &[f64] = &[0.50, 0.90, 0.95, 0.99];

/// Generate and display the load test report
pub async fn generate_report(
    config: &RuntimeConfig,
    metrics: &LoadTestMetrics,
    elapsed: Duration,
) -> Result<()> {
    println!("\n{}", "=".repeat(80));
    println!("Load Test Results");
    println!("{}", "=".repeat(80));

    // Test parameters
    println!("\nTest Parameters:");
    println!("  Duration:        {}s", config.duration_secs);
    println!("  Target Rate:     {} req/s", config.request_rps);
    println!("  Valid Rate:      {:.1}%", config.validity_distribution.valid_rate * 100.0);
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

    println!("  Total Requests:  {}", total_sent);
    println!("  Succeeded:       {} ({:.1}%)", total_succeeded, success_rate * 100.0);
    println!("  Failed:          {} ({:.1}%)", total_failed, (1.0 - success_rate) * 100.0);
    println!("  Achieved Rate:   {:.2} req/s", achieved_rate);
    println!("  Actual Duration: {:.2}s", elapsed.as_secs_f64());

    // Latency statistics
    println!("\n{}", "-".repeat(80));
    println!("Latency (End-to-End):");
    println!("{}", "-".repeat(80));

    let global_metrics = metrics.get_global_metrics();
    let latency = compute_latency_percentiles(&global_metrics.e2e_latency, LATENCY_QUANTILES);
    println!("  Mean:  {:.2}ms", latency.mean_ms());
    println!("  Min:   {:.2}ms", latency.min_ms());
    for (quantile, duration) in &latency.percentiles {
        println!("  p{:<2}:   {:.2}ms", (quantile * 100.0) as u32, duration.as_micros() as f64 / 1000.0);
    }
    println!("  Max:   {:.2}ms", latency.max_ms());

    // Breakdown by transaction type
    println!("\n{}", "-".repeat(80));
    println!("Results by Transaction Type:");
    println!("{}", "-".repeat(80));

    let mut by_validity = metrics.get_metrics_by_validity_type();
    by_validity.sort_by_key(|(vt, _)| format!("{:?}", vt));

    for (validity_type, vm) in &by_validity {
        if vm.sent > 0 {
            let success_rate = if vm.sent > 0 {
                vm.succeeded as f64 / vm.sent as f64 * 100.0
            } else {
                0.0
            };
            println!(
                "  {:20} Sent: {:6}  Succeeded: {:6}  Failed: {:6}  Success: {:5.1}%",
                format!("{}:", validity_type.as_str()),
                vm.sent,
                vm.succeeded,
                vm.failed,
                success_rate
            );
        }
    }

    println!("\n{}", "-".repeat(80));
    println!("Latency by Transaction Type:");
    println!("{}", "-".repeat(80));

    print!("{:<20}", "Type");
    print!(" {:>10}", "mean");
    print!(" {:>10}", "min");
    for &quantile in LATENCY_QUANTILES {
        print!(" {:>10}", format!("p{}", (quantile * 100.0) as u32));
    }
    println!(" {:>10}", "max");
    println!("{}", "-".repeat(80));

    for (validity_type, vm) in &by_validity {
        if vm.sent > 0 {
            let latency = compute_latency_percentiles(&vm.e2e_latency, LATENCY_QUANTILES);
            print!("{:<20}", validity_type.as_str());
            print!(" {:>9.2}ms", latency.mean_ms());
            print!(" {:>9.2}ms", latency.min_ms());
            for &quantile in LATENCY_QUANTILES {
                print!(" {:>9.2}ms", latency.get_ms(quantile).unwrap_or(0.0));
            }
            println!(" {:>9.2}ms", latency.max_ms());
        }
    }

    println!("\n{}", "=".repeat(80));

    Ok(())
}
