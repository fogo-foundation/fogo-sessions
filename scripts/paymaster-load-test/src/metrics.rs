use crate::config::ValidityType;
use dashmap::DashMap;
use hdrhistogram::Histogram;
use std::time::Duration;

/// Thread-safe metrics collector for load test results
/// Key: None = global metrics, Some(ValidityType) = per-validity-type metrics
pub struct LoadTestMetrics(DashMap<Option<ValidityType>, Metrics>);

#[derive(Debug, Clone)]
pub struct Metrics {
    pub sent: u64,
    pub succeeded: u64,
    pub failed: u64,
    pub e2e_latency: Histogram<u64>,
}

impl Default for Metrics {
    fn default() -> Self {
        Self {
            sent: 0,
            succeeded: 0,
            failed: 0,
            e2e_latency: Histogram::<u64>::new_with_bounds(1, 60_000_000, 2).unwrap(),
        }
    }
}

impl LoadTestMetrics {
    pub fn new() -> Self {
        Self(DashMap::new())
    }

    pub fn record_request_sent(&self, validity_type: ValidityType) {
        // update global metrics (key = None)
        self.0.entry(None).or_default().sent += 1;

        // update per validity-type metrics
        self.0.entry(Some(validity_type)).or_default().sent += 1;
    }

    pub fn record_success(&self, validity_type: ValidityType, latency: Duration) {
        let latency_us = latency.as_micros() as u64;

        {
            let mut global = self.0.entry(None).or_default();
            global.succeeded += 1;
            let _ = global.e2e_latency.record(latency_us);
        }

        {
            let mut entry = self.0.entry(Some(validity_type)).or_default();
            entry.succeeded += 1;
            let _ = entry.e2e_latency.record(latency_us);
        }
    }

    pub fn record_failure(&self, validity_type: ValidityType, latency: Duration) {
        let latency_us = latency.as_micros() as u64;

        {
            let mut global = self.0.entry(None).or_default();
            global.failed += 1;
            let _ = global.e2e_latency.record(latency_us);
        }

        {
            let mut entry = self.0.entry(Some(validity_type)).or_default();
            entry.failed += 1;
            let _ = entry.e2e_latency.record(latency_us);
        }
    }

    pub fn get_requests_sent(&self) -> u64 {
        self.0.get(&None).map(|m| m.sent).unwrap_or(0)
    }

    pub fn get_requests_succeeded(&self) -> u64 {
        self.0.get(&None).map(|m| m.succeeded).unwrap_or(0)
    }

    pub fn get_requests_failed(&self) -> u64 {
        self.0.get(&None).map(|m| m.failed).unwrap_or(0)
    }

    pub fn success_rate(&self) -> Option<f64> {
        if let Some(global) = self.0.get(&None) {
            let resolved = global.succeeded + global.failed;
            if resolved == 0 {
                return Some(0.0);
            }
            Some(global.succeeded as f64 / resolved as f64)
        } else {
            None
        }
    }

    pub fn get_metrics_by_validity_type(&self) -> Vec<(ValidityType, Metrics)> {
        self.0
            .iter()
            .filter_map(|entry| {
                // Only include per-validity-type metrics (Some), not global (None)
                entry.key().map(|vt| (vt, entry.value().clone()))
            })
            .collect()
    }

    pub fn get_global_metrics(&self) -> Metrics {
        self.0.get(&None).map(|m| m.clone()).unwrap_or_default()
    }
}

pub fn compute_latency_percentiles(hist: &Histogram<u64>, quantiles: &[f64]) -> LatencyPercentiles {
    if hist.is_empty() {
        return LatencyPercentiles::default();
    }

    let percentiles = quantiles
        .iter()
        .map(|&q| (q, Duration::from_micros(hist.value_at_quantile(q))))
        .collect();

    LatencyPercentiles {
        percentiles,
        min: Duration::from_micros(hist.min()),
        max: Duration::from_micros(hist.max()),
        mean: Duration::from_micros(hist.mean() as u64),
    }
}

#[derive(Debug, Clone, Default)]
pub struct LatencyPercentiles {
    pub percentiles: Vec<(f64, Duration)>,
    pub min: Duration,
    pub max: Duration,
    pub mean: Duration,
}

impl LatencyPercentiles {
    pub fn get(&self, quantile: f64) -> Option<Duration> {
        self.percentiles
            .iter()
            .find(|(q, _)| (*q - quantile).abs() < f64::EPSILON)
            .map(|(_, d)| *d)
    }

    pub fn get_ms(&self, quantile: f64) -> Option<f64> {
        self.get(quantile).map(|d| d.as_micros() as f64 / 1000.0)
    }

    pub fn min_ms(&self) -> f64 {
        self.min.as_micros() as f64 / 1000.0
    }

    pub fn max_ms(&self) -> f64 {
        self.max.as_micros() as f64 / 1000.0
    }

    pub fn mean_ms(&self) -> f64 {
        self.mean.as_micros() as f64 / 1000.0
    }
}
