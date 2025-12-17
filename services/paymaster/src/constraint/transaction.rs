use crate::constraint::gas::compute_gas_spend;
use crate::constraint::NON_SUBSTANTIVE_PROGRAM_IDS;
use solana_message::compiled_instruction::CompiledInstruction;
use solana_message::VersionedMessage;
use solana_signature::Signature;
use solana_transaction::versioned::VersionedTransaction;

pub struct TransactionToValidate<'a> {
    pub message: &'a VersionedMessage,
    pub signatures: &'a [Signature],
    pub substantive_instructions: Vec<InstructionWithIndex<'a>>,
    pub gas_spend: u64,
}

#[derive(Clone)]
pub struct InstructionWithIndex<'a> {
    pub index: usize,
    pub instruction: &'a CompiledInstruction,
}

impl<'a> TransactionToValidate<'a> {
    pub fn parse(transaction: &'a VersionedTransaction) -> anyhow::Result<Self> {
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
        })
    }
}
