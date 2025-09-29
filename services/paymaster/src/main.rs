use crate::config::load_config;
use clap::Parser;
use opentelemetry::trace::TracerProvider;
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

    let resource = opentelemetry_sdk::Resource::builder()
        .with_attributes(vec![
            opentelemetry::KeyValue::new("service.name", "paymaster-service"),
        ])
        .build();

    let exporter = opentelemetry_otlp::SpanExporter::builder()
        .with_tonic()
        .build()?;

    let provider = opentelemetry_sdk::trace::SdkTracerProvider::builder()
        .with_resource(resource)
        .with_span_processor(opentelemetry_sdk::trace::BatchSpanProcessor::builder(exporter).build())
        .build();

    let tracer = provider.tracer("paymaster-service");

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

    provider.shutdown()?;

    Ok(())
}
