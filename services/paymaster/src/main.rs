use std::{env, sync::Arc, time::Duration};

extern crate dotenv;
use crate::config_manager::load_config;
use clap::Parser;
use dotenv::dotenv;
use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
use tokio::sync::RwLock;
use tokio::time::interval;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod config_manager;
mod constraint;
mod constraint_templates;
mod db;
mod metrics;
mod rpc;
mod serde;

type DomainStateMap = std::collections::HashMap<String, api::DomainState>;
type SharedDomains = Arc<RwLock<DomainStateMap>>;

#[derive(Parser)]
struct Cli {
    #[clap(short, long, default_value = "./tilt/configs/paymaster.toml")]
    config: String,

    #[clap(short, long)]
    db: Option<String>,

    #[clap(long)]
    mnemonic_file: String,

    #[clap(long)]
    rpc_url_http: String,

    #[clap(long)]
    rpc_url_ws: Option<String>,

    #[clap(long, default_value = "0.0.0.0:4000")]
    listen_address: String,

    #[clap(long)]
    otlp_endpoint: Option<String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    let cli = Cli::parse();

    // Prefer CLI flag over env if present
    let database_url = cli
        .db
        .or_else(|| env::var("DATABASE_URL").ok())
        .expect("DATABASE_URL must be set via --db or env var");

    db::pool::init_db_connection(database_url).await?;

    let resource = opentelemetry_sdk::Resource::builder()
        .with_attributes(vec![opentelemetry::KeyValue::new(
            "service.name",
            "paymaster-service",
        )])
        .build();

    let otlp_endpoint = cli
        .otlp_endpoint
        .or_else(|| std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT").ok())
        .unwrap_or_else(|| "http://localhost:4317".to_string());

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

    // ----- load initial config -----
    let config_file_path = cli.config.clone();
    let config = config_manager::load_config::load_config(&config_file_path).await?;
    let mnemonic =
        std::fs::read_to_string(&config.mnemonic_file).expect("Failed to read mnemonic_file");

    let domains: SharedDomains = Arc::new(RwLock::new(api::get_domain_state_map(
        config.domains,
        &mnemonic,
    )));

    // ----- background refresher -----
    {
        let domains = Arc::clone(&domains);
        let config_file_path = config_file_path.clone();

        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs(2));
            // First tick fires immediately, we can skip it if we don't want a duplicate load.
            ticker.tick().await;

            loop {
                ticker.tick().await;

                match config_manager::load_config::load_config(&config_file_path).await {
                    Ok(new_config) => match std::fs::read_to_string(&new_config.mnemonic_file) {
                        Ok(new_mnemonic) => {
                            // Recompute the derived state
                            let new_domains =
                                api::get_domain_state_map(new_config.domains, &new_mnemonic);

                            // Atomically swap under a write lock
                            {
                                let mut guard = domains.write().await;
                                *guard = new_domains;
                            }

                            tracing::info!("Config/domains refreshed");
                        }
                        Err(e) => {
                            tracing::error!(
                                "Failed to read mnemonic file during config update: {}",
                                e
                            );
                        }
                    },
                    Err(e) => {
                        tracing::error!("Failed to load config: {}", e);
                    }
                }
            }
        });
    }

    api::run_server(config.solana_url, domains, config.listen_address).await;
    let rpc_url_ws = cli
        .rpc_url_ws
        .unwrap_or_else(|| cli.rpc_url_http.replace("http", "ws"));

    api::run_server(
        cli.mnemonic_file,
        cli.rpc_url_http,
        rpc_url_ws,
        cli.listen_address,
        domains,
    )
    .await;

    Ok(())
}
