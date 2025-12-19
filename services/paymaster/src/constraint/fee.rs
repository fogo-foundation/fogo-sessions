use anchor_lang::{AnchorDeserialize, Discriminator};
use fogo_sessions_sdk::tollbooth::TOLLBOOTH_PROGRAM_ID;
use solana_pubkey::Pubkey;
use solana_transaction::versioned::VersionedTransaction;
use std::collections::HashMap;
use tollbooth::{self, instruction::PayToll};

use crate::{constraint::transaction::InstructionWithIndex, rpc::ChainIndex};

const PAY_TOLL_INSTRUCTION_MINT_INDEX: usize = 4;

pub async fn compute_paymaster_toll(
    transaction: &VersionedTransaction,
    chain_index: &ChainIndex,
) -> anyhow::Result<HashMap<Pubkey, u64>> {
    transaction
        .message
        .instructions()
        .iter()
        .enumerate()
        .try_fold(HashMap::new(), |mut tolls, (index, ix)| {
            if ix.program_id(transaction.message.static_account_keys()) == &TOLLBOOTH_PROGRAM_ID {
                let (amount, mint): (u64, &Pubkey) = {
                    let discriminator = ix
                        .data
                        .get(0..1)
                        .ok_or_else(|| anyhow::anyhow!("PayToll instruction data is too short"))?;
                    anyhow::ensure!(
                        discriminator == tollbooth::instruction::PayToll::DISCRIMINATOR,
                        "Mismatching discriminator for PayToll instruction"
                    );
                    let PayToll { amount } =
                        tollbooth::instruction::PayToll::try_from_slice(&mut &ix.data[1..])
                            .map_err(|_| {
                                anyhow::anyhow!("Failed to deserialize PayToll instruction")
                            })?;

                    let mint_index = ix
                        .accounts
                        .get(PAY_TOLL_INSTRUCTION_MINT_INDEX)
                        .ok_or_else(|| {
                            anyhow::anyhow!("PayToll instruction missing mint account")
                        })?;
                    let mint = chain_index
                        .resolve_instruction_account_pubkey(
                            &transaction.message,
                            &InstructionWithIndex {
                                index,
                                instruction: ix,
                            },
                            usize::from(*mint_index),
                        )
                        .await?;
                    Ok::<_, anyhow::Error>((amount, mint))
                };
                *tolls.entry(*mint).or_insert(0) += amount;
            }
            Ok(tolls)
        })
}
