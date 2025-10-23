use clap::{Args, Parser, Subcommand};

#[derive(Debug, Parser)]
#[command(version, about)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Run the paymaster service (uses DB + env vars, no TOML)
    Run(RunOptions),

    /// Run DB migrations and exit (requires only DATABASE_URL)
    Migrate(MigrateOptions),

    /// Seed DB from a config file (requires DATABASE_URL + CONFIG_FILE)
    Seed(SeedOptions),
}

#[derive(Args, Debug, Clone)]
pub struct RunOptions {
    /// Postgres connection string (required via flag or env)
    #[arg(short = 'd', long = "db-url", env = "DATABASE_URL")]
    pub db_url: String,

    /// Path to mnemonic file (env/flag; optional)
    #[arg(long, env = "MNEMONIC_FILE", default_value = "./tilt/secrets/mnemonic")]
    pub mnemonic_file: String,

    #[arg(long, env = "RPC_URL_HTTP")]
    pub rpc_url_http: String,

    #[arg(long, env = "RPC_URL_WS")]
    pub rpc_url_ws: Option<String>,

    #[arg(long, env = "LISTEN_ADDRESS", default_value = "0.0.0.0:4000")]
    pub listen_address: String,

    #[arg(long, env = "OTEL_EXPORTER_OTLP_ENDPOINT")]
    pub otlp_endpoint: Option<String>,
}

#[derive(Args, Debug, Clone)]
pub struct MigrateOptions {
    /// Postgres connection string (required via flag or env)
    #[arg(short = 'd', long = "db-url", env = "DATABASE_URL")]
    pub db_url: String,
}

#[derive(Args, Debug, Clone)]
pub struct SeedOptions {
    /// Postgres connection string (required via flag or env)
    #[arg(short = 'd', long = "db-url", env = "DATABASE_URL")]
    pub db_url: String,

    /// Path to TOML config used to populate the DB (required via flag or env)
    #[arg(short, long, env = "CONFIG_FILE")]
    pub config: String,

    #[arg(long, env = "DEFAULT_USER_WALLET_ADDRESS")]
    pub default_user_wallet_address: String,
}
