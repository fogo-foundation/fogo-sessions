use borsh::BorshDeserialize;
use fogo_sessions_sdk::tollbooth::TOLLBOOTH_PROGRAM_ID;
use reqwest::StatusCode;
use solana_program::instruction::CompiledInstruction;
use solana_pubkey::Pubkey;
use solana_transaction::versioned::VersionedTransaction;
use crate::constraint::get_instruction_account_pubkey_by_index;
use crate::rpc::ChainIndex;
use serde::Deserialize;
use serde_with::{serde_as, DisplayFromStr};

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
    amount: u64,
    #[serde_as(as = "DisplayFromStr")]
    mint: Pubkey,
}

impl Tolls {
    const MINT_ACCOUNT_INDEX_PAY_TOLL_INSTRUCTION: usize = 4;

    pub async fn validate_toll_payment(&self, transaction: &VersionedTransaction, chain_index: &ChainIndex) -> Result<(), (StatusCode, String)> {
        let tollbooth_instructions : Vec<(usize, &CompiledInstruction)> = transaction.message.instructions().iter().enumerate().filter(|(_, ix)| {
            ix.program_id(transaction.message.static_account_keys()) == &TOLLBOOTH_PROGRAM_ID
        }).collect();

        match (self, tollbooth_instructions.as_slice()) {
            (Tolls::Free, []) => Ok(()),
            (Tolls::Free, _) => Err((
                StatusCode::BAD_REQUEST,
                "The paymaster for this domain does not require a toll payment".to_string(),
            )),
            (Tolls::Fixed(tolls), [(index, tollbooth_instruction)]) => {
                    #[derive(BorshDeserialize)]
                    enum TollboothInstruction {
                        PayToll(u64),
                    }
                    
                    let tollbooth_instruction_data = TollboothInstruction::try_from_slice(
                        &tollbooth_instruction.data,
                    )
                    .map_err(|_| {
                        (
                            StatusCode::BAD_REQUEST,
                            "Tollbooth instruction data is not valid".to_string(),
                        )
                    })?;
                    let TollboothInstruction::PayToll(amount) = tollbooth_instruction_data;
                    let mint = get_instruction_account_pubkey_by_index(transaction, tollbooth_instruction, *index, Self::MINT_ACCOUNT_INDEX_PAY_TOLL_INSTRUCTION, chain_index).await?;

                    if tolls.iter().any(|toll| toll.mint == mint && toll.amount == amount) {
                        return Ok(());
                    }
                    return Err((
                        StatusCode::BAD_REQUEST,
                        "Toll payment mint is not accepted by the paymaster or the amount is not correct".to_string(),
                    ));
            },
            (Tolls::Fixed(_), []) => Err((
                StatusCode::BAD_REQUEST,
                "The paymaster for this domain requires a toll payment".to_string(),
            )),
            (Tolls::Fixed(_), [_, ..]) => Err((
                StatusCode::BAD_REQUEST,
                "This transaction contains multiple tollbooth instructions".to_string(),
            )),
        }
    }
}