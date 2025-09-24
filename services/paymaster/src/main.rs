use fogo_paymaster::config::load_config;
use fogo_paymaster::api::run_server;
use clap::Parser;

#[derive(Parser)]
struct Cli {
    #[clap(short, long, default_value = "./tilt/configs/paymaster.toml")]
    config: String,
    #[clap(short, long, default_value = "./tilt/secrets/mnemonic")]
    mnemonic: String,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let config = load_config(&cli.config).unwrap();
    let mnemonic = std::fs::read_to_string(&cli.mnemonic).expect("Failed to read mnemonic_file");

    run_server(config, mnemonic).await
}
