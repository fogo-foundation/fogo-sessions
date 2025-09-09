use serde::{Deserialize, Deserializer};
use solana_pubkey::Pubkey;
use std::str::FromStr;

pub fn deserialize_pubkey_vec<'de, D>(deserializer: D) -> Result<Vec<Pubkey>, D::Error>
where
    D: Deserializer<'de>,
{
    let strings: Vec<String> = Vec::deserialize(deserializer)?;
    strings
        .into_iter()
        .map(|s| Pubkey::from_str(&s).map_err(serde::de::Error::custom))
        .collect()
}

pub fn deserialize_sol_to_lamports<'de, D>(deserializer: D) -> Result<u64, D::Error>
where
    D: Deserializer<'de>,
{
    let sol_value: f64 = f64::deserialize(deserializer)?;

    // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
    let lamports = (sol_value * 1_000_000_000.0) as u64;

    Ok(lamports)
}
