use anchor_lang::{AnchorDeserialize, Discriminator};
use fogo_sessions_sdk::tollbooth::TOLLBOOTH_PROGRAM_ID;
use reqwest::StatusCode;
use solana_program::instruction::CompiledInstruction;
use solana_pubkey::Pubkey;
use solana_transaction::versioned::VersionedTransaction;
use std::collections::HashMap;
use tollbooth::{self, instruction::PayToll};

use crate::{constraint::{VariationOrderedInstructionConstraints, transaction::{InstructionWithIndex, TransactionToValidate}}, rpc::ChainIndex};

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
                    mint_index,
                )
                .await?;

            tolls.entry(mint)
            .and_modify(|e: &mut u64| *e = e.saturating_add(amount))
            .or_insert(amount);
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
        tollbooth::instruction::PayToll::try_from_slice(&instruction.data[1..])
            .map_err(|_| anyhow::anyhow!("Failed to deserialize PayToll instruction"))?;

    let mint_index = instruction
        .accounts
        .get(PAY_TOLL_INSTRUCTION_MINT_INDEX)
        .ok_or_else(|| anyhow::anyhow!("PayToll instruction missing mint account"))?;
    Ok((amount, usize::from(*mint_index)))
}

const USDC_MINT: Pubkey = solana_program::pubkey!("uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG");
const FEE_COEFFICIENTS : [(Pubkey, u64); 2] = [
    (spl_token::native_mint::ID, 1),
    (USDC_MINT, 3333),
];

impl VariationOrderedInstructionConstraints {
    pub fn validate_paymaster_fee(&self, transaction: &TransactionToValidate<'_>) -> anyhow::Result<()> {
        let total_fee =
            FEE_COEFFICIENTS.iter().fold(0u64, |mut acc, (mint, coefficient)| {
                let fee = transaction.paymaster_fee.get(mint).unwrap_or(&0);
                acc = acc.saturating_add(fee.saturating_mul(*coefficient));
                acc
            });

       anyhow::ensure!(total_fee >= self.paymaster_fee_lamports.unwrap_or(0), "Paymaster fee is not sufficient");
        
        Ok(())
    }
}