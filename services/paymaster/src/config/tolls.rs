
use serde::Deserialize;
use serde_with::{serde_as, DisplayFromStr};
use solana_pubkey::Pubkey;

#[derive(Default, Deserialize, Clone)]
#[serde_as]
pub enum Tolls {
    #[serde(rename = "free")]
    #[default]
    Free,
    #[serde(rename = "fixed")]
    Fixed(Vec<Toll>),
}

#[serde_as]
#[derive(Deserialize, Clone)]

pub struct Toll {
    pub amount: u64,
    #[serde_as(as = "DisplayFromStr")]
    pub mint: Pubkey,
}
