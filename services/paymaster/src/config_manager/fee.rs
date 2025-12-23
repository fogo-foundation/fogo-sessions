use serde::{Deserialize, Serialize};
use serde_with::{serde_as, DisplayFromStr};
use solana_pubkey::Pubkey;
use std::collections::HashMap;

#[serde_as]
#[derive(Deserialize, Serialize, Default)]
pub struct Config {
    #[serde(default)]
    #[serde_as(as = "HashMap<DisplayFromStr, _>")]
    pub fee_coefficients: HashMap<Pubkey, u64>,
}
