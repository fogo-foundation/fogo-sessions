use hdrhistogram::Histogram;
use std::time::Duration;

/// Thread-safe metrics collector for load test results
/// Key: None = global metrics, Some(ValidityType) = per-validity-type metrics

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

impl Metrics {
    pub fn record_request_sent(&mut self) {
        self.sent += 1;
    }

    pub fn record_success(&mut self, latency: Duration) {
        let latency_us = latency.as_micros() as u64;

        self.succeeded += 1;
        let _ = self.e2e_latency.record(latency_us);
    }

    pub fn record_failure(&mut self, latency: Duration) {
        let latency_us = latency.as_micros() as u64;

        self.failed += 1;
        let _ = self.e2e_latency.record(latency_us);
    }

    pub fn get_requests_sent(&self) -> u64 {
        self.sent
    }

    pub fn get_requests_succeeded(&self) -> u64 {
        self.succeeded
    }

    pub fn get_requests_failed(&self) -> u64 {
        self.failed
    }

    pub fn success_rate(&self) -> Option<f64> {
        let resolved = self.succeeded + self.failed;
        if resolved == 0 {
            return Some(0.0);
        }
        Some(self.succeeded as f64 / resolved as f64)
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
