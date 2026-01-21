use crate::{
    cli::Cli,
    config_manager::{config::Config, fee},
};
use arc_swap::ArcSwap;
use clap::Parser;
use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::trace::BatchConfigBuilder;
use std::collections::HashMap;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
mod api;
mod cli;
mod config_manager;
mod constraint;
mod db;
mod metrics;
mod pooled_http_sender;
mod rpc;
mod serde;

type DomainStateMap = HashMap<String, api::DomainState>;
type SharedDomains = Arc<ArcSwap<DomainStateMap>>;

async fn run_server(opts: cli::RunOptions) -> anyhow::Result<()> {
    let resource = opentelemetry_sdk::Resource::builder()
        .with_attributes(vec![opentelemetry::KeyValue::new(
            "service.name",
            format!("paymaster-service-{}", opts.network_environment),
        )])
        .build();

    let exporter = opentelemetry_otlp::SpanExporter::builder()
        .with_tonic()
        .with_endpoint(opts.otlp_endpoint)
        .build()?;

    let provider = opentelemetry_sdk::trace::SdkTracerProvider::builder()
        .with_resource(resource)
        .with_span_processor(
            opentelemetry_sdk::trace::BatchSpanProcessor::builder(exporter)
                .with_batch_config(BatchConfigBuilder::default().build())
                .build(),
        )
        .build();

    let tracer = provider.tracer("paymaster-service");
    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(false)
                .with_file(true)
                .with_line_number(true)
                .with_thread_ids(true)
                .with_level(true)
                .json(),
        )
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".parse().expect("info is a valid env filter")),
        )
        .with(telemetry)
        .init();

    db::pool::init_db_connection(&opts.db_url).await?;
    /* TODO Revert this once we have a good way of modifying the config from the DB. */
    // let mut config =
    //     config_manager::load_config::load_db_config(opts.network_environment).await?;
    let config: Config = config::Config::builder()
        .add_source(config::File::with_name(&opts.config_file))
        .build()?
        .try_deserialize()?;

    let fee::Config { fee_coefficients }: fee::Config = config::Config::builder()
        .add_source(config::File::with_name(&opts.config_file))
        .build()?
        .try_deserialize()?;

    let mnemonic =
        std::fs::read_to_string(&opts.mnemonic_file).expect("Failed to read mnemonic_file");
    let domains: SharedDomains = Arc::new(ArcSwap::from_pointee(api::get_domain_state_map(
        config.domains,
        &mnemonic,
    )?));
    // TODO this is commented out as part of the temporary change to load the config from the file.
    // config_manager::load_config::spawn_config_refresher(
    //     opts.network_environment,
    //     mnemonic,
    //     Arc::clone(&domains),
    //     opts.db_refresh_interval_seconds,
    // );

    let rpc_url_ws = opts
        .rpc_url_ws
        .unwrap_or_else(|| opts.rpc_url_http.replace("http", "ws"));
    api::run_server(
        opts.rpc_url_http,
        rpc_url_ws,
        opts.ftl_url,
        opts.listen_address,
        domains,
        fee_coefficients,
    )
    .await;
    Ok(())
}

async fn run_migrations(opts: cli::MigrateOptions) -> anyhow::Result<()> {
    db::pool::init_db_connection(&opts.db_url).await?;
    db::pool::run_migrations().await?;
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    match Cli::parse().command {
        cli::Command::Run(opts) => run_server(opts).await?,
        cli::Command::Migrate(opts) => run_migrations(opts).await?,
    }

    Ok(())
}
