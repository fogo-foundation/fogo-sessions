use crate::config::load_config;
use clap::Parser;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod config;
mod constraint;
mod constraint_templates;
mod metrics;
mod rpc;
mod serde;

#[derive(Parser)]
struct Cli {
    #[clap(short, long, default_value = "./tilt/configs/paymaster.toml")]
    config: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let config = load_config(&cli.config).unwrap();

    let otlp_exporter = opentelemetry_otlp::new_exporter()
        .tonic();

    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(otlp_exporter)
        .with_trace_config(
            opentelemetry_sdk::trace::Config::default()
                .with_resource(opentelemetry_sdk::Resource::new(vec![
                    opentelemetry::KeyValue::new("service.name", "paymaster-service"),
                ])),
        )
        .install_batch(opentelemetry_sdk::runtime::Tokio)?;

    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(false)
                .with_level(true),
        )
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(
            |_| "info,paymaster=trace".parse().unwrap(),
        ))
        .with(telemetry)
        .init();

    api::run_server(config).await;

    opentelemetry::global::shutdown_tracer_provider();

    Ok(())
}
