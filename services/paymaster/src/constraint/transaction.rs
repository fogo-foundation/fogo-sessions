use crate::constraint::fee::compute_paymaster_toll;
use crate::constraint::gas::compute_gas_spend;
use crate::constraint::NON_SUBSTANTIVE_PROGRAM_IDS;
use crate::rpc::ChainIndex;
use solana_message::compiled_instruction::CompiledInstruction;
use solana_message::VersionedMessage;
use solana_pubkey::Pubkey;
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;
use std::collections::HashMap;

pub struct TransactionToValidate<'a> {
    pub message: &'a VersionedMessage,
    pub signatures: &'a [Signature],
    pub substantive_instructions: Vec<InstructionWithIndex<'a>>,
    pub gas_spend: u64,
    pub paymaster_fee: HashMap<Pubkey, u64>,
}

#[derive(Clone)]
pub struct InstructionWithIndex<'a> {
    pub index: usize,
    pub instruction: &'a CompiledInstruction,
}

impl<'a> TransactionToValidate<'a> {
    pub async fn parse(
        transaction: &'a VersionedTransaction,
        chain_index: &ChainIndex,
    ) -> anyhow::Result<Self> {
        Ok(Self {
            message: &transaction.message,
            signatures: &transaction.signatures,
            substantive_instructions: transaction
                .message
                .instructions()
                .iter()
                .filter(|instruction| {
                    !NON_SUBSTANTIVE_PROGRAM_IDS
                        .contains(instruction.program_id(transaction.message.static_account_keys()))
                })
                .enumerate()
                .map(|(index, instruction)| InstructionWithIndex { index, instruction }) // We store the indexes of instructions in the original vector so we can return them in the error messages if a tranasaction fails validation
                .collect(),
            gas_spend: compute_gas_spend(transaction)?,
            paymaster_fee: compute_paymaster_toll(transaction, chain_index).await?,
        })
    }
}
