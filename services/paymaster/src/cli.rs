use clap::{Args, Parser, Subcommand};

#[derive(Debug, Parser)]
#[command(version, about)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Run the paymaster service
    Run(RunOptions),
}

#[derive(Args, Debug, Clone)]
pub struct RunOptions {
    /// Path to TOML config
    #[arg(short = 'c', long = "config-file", env = "CONFIG_FILE")]
    pub config_file: String,

    /// Path to mnemonic file (env/flag; optional)
    #[arg(long, env = "MNEMONIC_FILE", default_value = "./tilt/secrets/mnemonic")]
    pub mnemonic_file: String,

    #[arg(long, env = "RPC_URL_HTTP", default_value = "http://localhost:8899")]
    pub rpc_url_http: String,

    #[arg(long, env = "RPC_URL_WS")]
    pub rpc_url_ws: Option<String>,

    #[arg(long, env = "LISTEN_ADDRESS", default_value = "0.0.0.0:4000")]
    pub listen_address: String,

    #[arg(
        long,
        env = "OTEL_EXPORTER_OTLP_ENDPOINT",
        default_value = "http://localhost:4317"
    )]
    pub otlp_endpoint: String,

    // TODO: this is a temporary change and should be removed once we load the ntt_quoter from the DB
    #[arg(long, env = "NTT_QUOTER")]
    pub ntt_quoter: String,
}
