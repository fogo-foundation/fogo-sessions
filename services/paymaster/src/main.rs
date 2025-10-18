use std::sync::Arc;

extern crate dotenv;
use clap::Parser;
use dotenv::dotenv;
use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
use tokio::sync::RwLock;
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

#[derive(Debug, Parser)]
#[clap(author, version, about, long_about = None)]
struct Cli {
    #[clap(
        short,
        long,
        env = "CONFIG_FILE",
        default_value = "./tilt/configs/paymaster.toml"
    )]
    config: String,

    #[clap(short, long, env = "DATABASE_URL")]
    db_url: Option<String>,

    #[clap(long, env = "MNEMONIC_FILE", default_value = "./tilt/secrets/mnemonic")]
    mnemonic_file: String,

    #[clap(long, env = "RPC_URL_HTTP")]
    rpc_url_http: Option<String>,

    #[clap(long, env = "RPC_URL_WS")]
    rpc_url_ws: Option<String>,

    #[clap(long, env = "LISTEN_ADDRESS", default_value = "0.0.0.0:4000")]
    listen_address: String,

    #[clap(long, env = "OTEL_EXPORTER_OTLP_ENDPOINT")]
    otlp_endpoint: Option<String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    let cli = Cli::parse();
    let database_url = cli
        .db_url
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
    let config = config_manager::load_config::load_config(&cli.config).await?;
    let mnemonic =
        std::fs::read_to_string(&cli.mnemonic_file).expect("Failed to read mnemonic_file");
    let domains: SharedDomains = Arc::new(RwLock::new(api::get_domain_state_map(
        config.domains,
        &mnemonic,
    )));

    // ----- spawn config refresher -----
    config_manager::load_config::spawn_config_refresher(cli.config, mnemonic, &domains);

    let rpc_url_http = cli.rpc_url_http.unwrap();

    let rpc_url_ws = cli
        .rpc_url_ws
        .unwrap_or_else(|| rpc_url_http.replace("http", "ws"));
    api::run_server(rpc_url_http, rpc_url_ws, cli.listen_address, domains).await;

    Ok(())
}
