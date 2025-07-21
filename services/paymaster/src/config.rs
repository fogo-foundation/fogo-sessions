use solana_keypair::Keypair;

pub struct Config {
    pub keypair: Keypair,
    pub url: String,
    pub listen_address: String,
}
