use serde::{Deserialize, Deserializer, Serialize, Serializer};
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

pub fn serialize_pubkey_vec<S>(keys: &[Pubkey], serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    let strings: Vec<String> = keys.iter().map(|k| k.to_string()).collect();
    strings.serialize(serializer)
}
