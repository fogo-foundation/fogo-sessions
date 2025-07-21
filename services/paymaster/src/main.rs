use crate::config::load_config;
use clap::Parser;

mod api;
mod config;

#[derive(Parser)]
struct Cli {
    #[clap(short, long, default_value = "./tilt/configs/paymaster.toml")]
    config: String,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let config = load_config(&cli.config).unwrap();

    api::run_server(config).await
}
