use crate::db::config::NetworkEnvironment as DbNetworkEnvironment;
use clap::{Args, Parser, Subcommand, ValueEnum};
use solana_pubkey::Pubkey;
use std::{
    collections::HashMap,
    fmt::{self, Display},
    str::FromStr,
};
#[derive(Debug, Parser)]
#[command(version, about)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[allow(clippy::large_enum_variant)]
#[derive(Debug, Subcommand)]
pub enum Command {
    /// Run the paymaster service (uses DB + env vars, no TOML)
    Run(RunOptions),

    /// Run DB migrations and exit (requires only DATABASE_URL)
    Migrate(MigrateOptions),
}

#[derive(Debug, Clone, Copy, ValueEnum)]
#[clap()]
pub enum NetworkEnvironment {
    Mainnet,
    Testnet,
    Localnet,
}

impl Display for NetworkEnvironment {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            NetworkEnvironment::Mainnet => write!(f, "mainnet"),
            NetworkEnvironment::Testnet => write!(f, "testnet"),
            NetworkEnvironment::Localnet => write!(f, "localnet"),
        }
    }
}

impl From<NetworkEnvironment> for DbNetworkEnvironment {
    fn from(val: NetworkEnvironment) -> Self {
        match val {
            NetworkEnvironment::Mainnet => DbNetworkEnvironment::Mainnet,
            NetworkEnvironment::Testnet => DbNetworkEnvironment::Testnet,
            NetworkEnvironment::Localnet => DbNetworkEnvironment::Localnet,
        }
    }
}

fn parse_fee_coefficients(s: &str) -> Result<HashMap<Pubkey, u64>, String> {
    let string_map = serde_json::from_str::<HashMap<String, u64>>(s)
        .map_err(|e| format!("Invalid JSON for fee coefficients: {e}"))?;

    let mut result = HashMap::new();
    for (key, value) in string_map {
        let pubkey =
            Pubkey::from_str(&key).map_err(|e| format!("Invalid Pubkey '{}': {}", key, e))?;
        result.insert(pubkey, value);
    }

    Ok(result)
}

#[derive(Args, Debug, Clone)]
pub struct RunOptions {
    /// Postgres connection string (required via flag or env)
    #[arg(short = 'd', long = "db-url", env = "DATABASE_URL")]
    pub db_url: String,

    /// Network environment to run the paymaster for
    #[arg(long, env = "NETWORK_ENVIRONMENT")]
    pub network_environment: NetworkEnvironment,

    /// Path to mnemonic file (env/flag; optional)
    #[arg(long, env = "MNEMONIC_FILE", default_value = "./tilt/secrets/mnemonic")]
    pub mnemonic_file: String,

    #[arg(long, env = "RPC_URL_HTTP", default_value = "http://localhost:8899")]
    pub rpc_url_http: String,

    #[arg(long, env = "RPC_URL_WS")]
    pub rpc_url_ws: Option<String>,

    #[arg(long, env = "FTL_URL")]
    pub ftl_url: Option<String>,

    #[arg(long, env = "LISTEN_ADDRESS", default_value = "0.0.0.0:4000")]
    pub listen_address: String,

    #[arg(
        long,
        env = "OTEL_EXPORTER_OTLP_ENDPOINT",
        default_value = "http://localhost:4317"
    )]
    pub otlp_endpoint: String,

    #[arg(long, env = "DB_REFRESH_INTERVAL_SECONDS", default_value = "10")]
    pub db_refresh_interval_seconds: u64,

    #[arg(long, env = "VALIANT_API_KEY")]
    pub valiant_api_key: Option<String>,

    #[arg(long, env = "VALIANT_OVERRIDE_URL")]
    pub valiant_override_url: Option<String>,

    #[arg(long, env = "FEE_COEFFICIENTS", value_parser = parse_fee_coefficients, default_value = "{}")]
    pub fee_coefficients: HashMap<Pubkey, u64>,

    #[arg(long, env = "BALANCE_REFRESH_INTERVAL_SECONDS", default_value = "10")]
    pub balance_refresh_interval_seconds: u64,

    /// Minimum balance in FOGO tokens for a paymaster wallet to be considered funded
    #[arg(long, env = "MINIMUM_BALANCE", default_value_t = 0.1)]
    pub minimum_balance: f64,
}

#[derive(Args, Debug, Clone)]
pub struct MigrateOptions {
    /// Postgres connection string (required via flag or env)
    #[arg(short = 'd', long = "db-url", env = "DATABASE_URL")]
    pub db_url: String,
}
