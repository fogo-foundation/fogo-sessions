use crate::constraint::gas::compute_gas_spend;
use solana_message::compiled_instruction::CompiledInstruction;
use solana_transaction::versioned::VersionedTransaction;
use std::collections::VecDeque;
use std::ops::Deref;

pub struct TransactionToValidate<'a> {
    transaction: &'a VersionedTransaction,
    pub substantive_instructions: VecDeque<InstructionWithIndex<'a>>,
    pub gas_spend: u64,
}

impl<'a> Deref for TransactionToValidate<'a> {
    type Target = VersionedTransaction;

    fn deref(&self) -> &Self::Target {
        self.transaction
    }
}

#[derive(Clone)]
pub struct InstructionWithIndex<'a> {
    pub index: usize,
    pub instruction: &'a CompiledInstruction,
}

impl<'a> TransactionToValidate<'a> {
    pub fn parse(transaction: &'a VersionedTransaction) -> anyhow::Result<Self> {
        Ok(Self {
            transaction,
            substantive_instructions: transaction
                .message
                .instructions()
                .iter()
                .filter(|instruction| {
                    instruction.program_id(transaction.message.static_account_keys())
                        != &solana_compute_budget_interface::id()
                })
                .enumerate()
                .map(|(index, instruction)| InstructionWithIndex { index, instruction })
                .collect(),
            gas_spend: compute_gas_spend(transaction)?,
        })
    }
}
