use anchor_lang::{AnchorDeserialize, Discriminator};
use fogo_sessions_sdk::tollbooth::TOLLBOOTH_PROGRAM_ID;
use reqwest::StatusCode;
use solana_program::instruction::CompiledInstruction;
use solana_pubkey::Pubkey;
use solana_transaction::versioned::VersionedTransaction;
use std::collections::HashMap;
use tollbooth::{self, instruction::PayToll};

use crate::{constraint::transaction::InstructionWithIndex, rpc::ChainIndex};

const PAY_TOLL_INSTRUCTION_MINT_INDEX: usize = 4;

pub async fn compute_paymaster_toll(
    transaction: &VersionedTransaction,
    chain_index: &ChainIndex,
) -> Result<HashMap<Pubkey, u64>, (StatusCode, String)> {
    let mut tolls = HashMap::new();
    for (instruction_index, instruction) in transaction.message.instructions().iter().enumerate() {
        if instruction.program_id(transaction.message.static_account_keys())
            == &TOLLBOOTH_PROGRAM_ID
        {
            let (amount, mint_index): (u64, usize) = parse_pay_toll_instruction(instruction)
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

            // this is not the best if there are multiple address lookup tables
            let mint = chain_index
                .resolve_instruction_account_pubkey(
                    &transaction.message,
                    &InstructionWithIndex {
                        index: instruction_index,
                        instruction,
                    },
                    usize::from(mint_index),
                )
                .await?;
            *tolls.entry(mint).or_insert(0) += amount;
        }
    }
    Ok(tolls)
}

fn parse_pay_toll_instruction(instruction: &CompiledInstruction) -> anyhow::Result<(u64, usize)> {
    let discriminator = instruction
        .data
        .get(0..1)
        .ok_or_else(|| anyhow::anyhow!("PayToll instruction data is too short"))?;
    anyhow::ensure!(
        discriminator == tollbooth::instruction::PayToll::DISCRIMINATOR,
        "Mismatching discriminator for PayToll instruction"
    );
    let PayToll { amount } =
        tollbooth::instruction::PayToll::try_from_slice(&mut &instruction.data[1..])
            .map_err(|_| anyhow::anyhow!("Failed to deserialize PayToll instruction"))?;

    let mint_index = instruction
        .accounts
        .get(PAY_TOLL_INSTRUCTION_MINT_INDEX)
        .ok_or_else(|| anyhow::anyhow!("PayToll instruction missing mint account"))?;
    Ok((amount, usize::from(*mint_index)))
}
