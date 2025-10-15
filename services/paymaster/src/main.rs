use crate::config::load_config;
use clap::Parser;
use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
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
    let cli = Cli::parse();
    let config = load_config(&cli.config).unwrap();
    let domains = config.domains;

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
