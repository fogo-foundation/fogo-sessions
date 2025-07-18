use crate::config::Config;
use clap::Parser;
use solana_keypair::Keypair;
use solana_signer::EncodableKey;

mod api;
mod config;

#[derive(Parser)]
struct Cli {
    #[clap(short, long, default_value = "./tilt/keypairs/sponsor.json")]
    keypair_path: String,
    #[clap(short, long, default_value = "http://127.0.0.1:8899")]
    url: String,
    #[clap(short, long, default_value = "0.0.0.0:4000")]
    listen_address: String,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let keypair = Keypair::read_from_file(&cli.keypair_path).unwrap();

    api::run_server(Config {
        keypair,
        url: cli.url,
        listen_address: cli.listen_address,
    })
    .await
}
