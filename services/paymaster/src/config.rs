use solana_keypair::Keypair;

pub struct Config {
    pub keypair : Keypair,
    pub url : String,
    pub port : u16,
}