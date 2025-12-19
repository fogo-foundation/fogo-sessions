use serde::{Deserialize, Deserializer, Serialize};
use serde_with::{serde_as, DisplayFromStr};
use solana_pubkey::Pubkey;
use std::collections::HashMap;

fn deserialize_fee_coefficients<'de, D>(
    deserializer: D,
) -> Result<HashMap<Pubkey, u64>, D::Error>
where
    D: Deserializer<'de>,
{
    #[serde_as]
    #[derive(Deserialize)]
    struct FeeCoefficient {
        #[serde_as(as = "DisplayFromStr")]
        mint: Pubkey,
        coefficient: u64,
    }

    let coefficients: Vec<FeeCoefficient> = Vec::deserialize(deserializer)?;
    coefficients.into_iter().try_fold(
        HashMap::new(),
        |mut map, FeeCoefficient { mint, coefficient }| {
            if map.insert(mint, coefficient).is_some() {
                return Err(serde::de::Error::custom(format!(
                    "Duplicate mint {mint} in paymaster fee coefficients"
                )));
            }
            Ok(map)
        },
    )
}

#[derive(Deserialize, Serialize, Default)]
pub struct Config {
    #[serde(deserialize_with = "deserialize_fee_coefficients")]
    pub fee_coefficients: HashMap<Pubkey, u64>,
}
