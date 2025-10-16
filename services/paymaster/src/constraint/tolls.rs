use borsh::BorshDeserialize;
use fogo_sessions_sdk::tollbooth::TOLLBOOTH_PROGRAM_ID;
use reqwest::StatusCode;
use solana_pubkey::Pubkey;
use solana_transaction::versioned::VersionedTransaction;
use crate::config::tolls::Toll as TollConfiguration;
use crate::config::tolls::Tolls as TollsConfiguration;
use crate::constraint::get_instruction_account_pubkey_by_index;
use crate::rpc::ChainIndex;

pub enum Tolls {
    Free,
    Fixed(Vec<Toll>),
}

struct Toll {
    pub amount: u64,
    pub mint: Pubkey,
}

impl From<TollsConfiguration> for Tolls {
    fn from(tolls: TollsConfiguration) -> Self {
        match tolls {
            TollsConfiguration::Free => Self::Free,
            TollsConfiguration::Fixed(toll) => Self::Fixed(toll.into_iter().map(|toll| toll.into()).collect()),
        }
    }
}

impl From<TollConfiguration> for Toll {
    fn from(toll: TollConfiguration) -> Self {
        Self {
            amount: toll.amount,
            mint: toll.mint,
        }
    }
}

impl Tolls {
    const MINT_ACCOUNT_INDEX_PAY_TOLL_INSTRUCTION: usize = 4;

    pub async fn validate_toll_payment(&self, transaction: &VersionedTransaction, chain_index: &ChainIndex) -> Result<(), (StatusCode, String)> {
        match self {
            Tolls::Free => Ok(()),
            Tolls::Fixed(tolls) => {
                let tollbooth_instructions = transaction.message.instructions().iter().enumerate().filter(|(index, ix)| {
                    ix.program_id(transaction.message.static_account_keys()) == &TOLLBOOTH_PROGRAM_ID
                });
            
                match tollbooth_instructions.collect::<Vec<_>>()[..] {
                    [(index, tollbooth_instruction)] => {
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
                        let mint = get_instruction_account_pubkey_by_index(transaction, tollbooth_instruction, index, Self::MINT_ACCOUNT_INDEX_PAY_TOLL_INSTRUCTION, chain_index).await?;

                        if tolls.iter().any(|toll| toll.mint == mint && toll.amount < amount) {
                            return Ok(());
                        }
                        return Err((
                            StatusCode::BAD_REQUEST,
                            "Payment toll is less than the minimum or not the correct mint".to_string(),
                        ));

                    }
                    [] => {
                        return Err((
                            StatusCode::BAD_REQUEST,
                            "Paymaster tolls are required for this domain".to_string(),
                        ))
                    }
                    _ => {
                        return Err((    
                            StatusCode::BAD_REQUEST,
                            "Multiple paymaster tolls instructionsfound".to_string(),
                        ))
                    }
                }
            }
        }
    }
}