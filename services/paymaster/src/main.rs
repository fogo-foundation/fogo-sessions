use std::{env, os::unix::process};

use crate::config::load_config;
extern crate dotenv;
use clap::Parser;
use dotenv::dotenv;
use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod config;
mod constraint;
mod constraint_templates;
mod db;
mod metrics;
mod rpc;
mod serde;
#[derive(Parser)]
struct Cli {
    #[clap(short, long, default_value = "./tilt/configs/paymaster.toml")]
    config: String,
    #[clap(short, long)]
    db: Option<String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    let cli = Cli::parse();
    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| cli.db.unwrap());
    let config = load_config(&cli.config).unwrap();

    db::pool::init_db_connection(database_url).await?;
    db::seed_from_config::seed_from_config(&config).await?;

    let mut db_config = db::load_config::load_config().await?;
    db_config.mnemonic_file =
        env::var("MNEMONIC_FILE").unwrap_or_else(|_| config.mnemonic_file.clone());
    db_config.solana_url = env::var("SOLANA_URL").unwrap_or_else(|_| config.solana_url.clone());
    db_config.listen_address =
        env::var("LISTEN_ADDRESS").unwrap_or_else(|_| config.listen_address.clone());

    let resource = opentelemetry_sdk::Resource::builder()
        .with_attributes(vec![opentelemetry::KeyValue::new(
            "service.name",
            "paymaster-service",
        )])
        .build();
    println!(
        "db_config: {:#?}",
        db_config.domains[0].tx_variations[0].name()
    );
    let otlp_endpoint = std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT")
        .unwrap_or_else(|_| "http://localhost:4317".to_string());

    let exporter = opentelemetry_otlp::SpanExporter::builder()
        .with_tonic()
        .with_endpoint(otlp_endpoint)
        .build()?;

    let provider = opentelemetry_sdk::trace::SdkTracerProvider::builder()
        .with_resource(resource)
        .with_span_processor(
            opentelemetry_sdk::trace::BatchSpanProcessor::builder(exporter).build(),
        )
        .build();

    let tracer = provider.tracer("paymaster-service");

    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(false)
                .with_level(true),
        )
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,paymaster=trace".parse().unwrap()),
        )
        .with(telemetry)
        .init();

    api::run_server(config).await;

    Ok(())
}
