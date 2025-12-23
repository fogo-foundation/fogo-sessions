use anchor_lang::{AnchorDeserialize, Discriminator};
use fogo_sessions_sdk::tollbooth::TOLLBOOTH_PROGRAM_ID;
use reqwest::StatusCode;
use solana_program::instruction::CompiledInstruction;
use solana_pubkey::Pubkey;
use solana_transaction::versioned::VersionedTransaction;
use std::collections::HashMap;
use tollbooth::{self, instruction::PayToll};

use crate::{
    constraint::transaction::InstructionWithIndex,
    rpc::ChainIndex,
};

const PAY_TOLL_INSTRUCTION_MINT_INDEX: usize = 4;

pub async fn compute_paymaster_fees(
    transaction: &VersionedTransaction,
    chain_index: &ChainIndex,
) -> Result<HashMap<Pubkey, u64>, (StatusCode, String)> {
    let mut tolls = HashMap::new();
    for (index, instruction) in transaction.message.instructions().iter().enumerate() {
        if instruction.program_id(transaction.message.static_account_keys())
            == &TOLLBOOTH_PROGRAM_ID
        {
            let amount = parse_pay_toll_instruction(instruction)
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

            let mint = chain_index
                .resolve_instruction_account_pubkey(
                    &transaction.message,
                    &InstructionWithIndex { index, instruction },
                    PAY_TOLL_INSTRUCTION_MINT_INDEX,
                )
                .await?;

            tolls
                .entry(mint)
                .and_modify(|e: &mut u64| *e = e.saturating_add(amount))
                .or_insert(amount);
        }
    }
    Ok(tolls)
}

fn parse_pay_toll_instruction(instruction: &CompiledInstruction) -> anyhow::Result<u64> {
    let discriminator = instruction
        .data
        .get(0..1)
        .ok_or_else(|| anyhow::anyhow!("PayToll instruction data is too short"))?;
    anyhow::ensure!(
        discriminator == tollbooth::instruction::PayToll::DISCRIMINATOR,
        "Mismatching discriminator for PayToll instruction"
    );
    let PayToll { amount } =
        tollbooth::instruction::PayToll::try_from_slice(&instruction.data[1..])
            .map_err(|_| anyhow::anyhow!("Failed to deserialize PayToll instruction"))?;
    Ok(amount)
}
