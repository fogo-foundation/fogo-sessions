use crate::constraint::ContextualDomainKeys;
use crate::constraint::{check_gas_spend, InstructionConstraint};
use crate::rpc::ChainIndex;
use reqwest::StatusCode;
use solana_message::compiled_instruction::CompiledInstruction;
use solana_transaction::versioned::VersionedTransaction;
use std::collections::VecDeque;
use std::marker::PhantomData;

pub struct PartiallyValidatedTransaction<'a, T: ValidationState> {
    transaction: &'a VersionedTransaction,
    remaining_instructions: VecDeque<InstructionWithIndex<'a>>,
    _validation_state: PhantomData<T>,
}

pub struct InstructionWithIndex<'a> {
    pub index: usize,
    pub instruction: &'a CompiledInstruction,
}

pub trait ValidationState {}

pub struct Unvalidated {}

pub struct ComputeInstructionValidated {}

impl ValidationState for Unvalidated {}

impl ValidationState for ComputeInstructionValidated {}

impl<'a> PartiallyValidatedTransaction<'a, Unvalidated> {
    pub fn new(transaction: &'a VersionedTransaction) -> Self {
        Self {
            transaction,
            remaining_instructions: transaction
                .message
                .instructions()
                .iter()
                .enumerate()
                .map(|(index, instruction)| InstructionWithIndex { index, instruction })
                .collect(),
            _validation_state: PhantomData::default(),
        }
    }

    pub fn validate_compute_units(
        self,
        max_gas_spend: u64,
    ) -> Result<PartiallyValidatedTransaction<'a, ComputeInstructionValidated>, (StatusCode, String)>
    {
        check_gas_spend(self.transaction, max_gas_spend)?;
        Ok(PartiallyValidatedTransaction {
            transaction: self.transaction,
            remaining_instructions: self
                .remaining_instructions
                .into_iter()
                .filter(
                    |InstructionWithIndex {
                         index: _,
                         instruction,
                     }| {
                        instruction.program_id(self.transaction.message.static_account_keys())
                            != &solana_compute_budget_interface::id()
                    },
                )
                .collect(),
            _validation_state: PhantomData::default(),
        })
    }
}

impl<'a> PartiallyValidatedTransaction<'a, ComputeInstructionValidated> {
    pub async fn validate_instruction_constraints(
        mut self,
        instruction_constraints: &[InstructionConstraint],
        contextual_domain_keys: &ContextualDomainKeys,
        variation_name: &str,
        chain_index: &ChainIndex,
    ) -> Result<(), (StatusCode, String)> {
        let mut instruction = self.remaining_instructions.pop_front();

        // Note: this validation algorithm is technically incorrect, because of optional constraints.
        // E.g. instruction i might match against both constraint j and constraint j+1; if constraint j
        // is optional, it might be possible that matching against j leads to failure due to later
        // constraints failing while matching against j+1 would result in a valid transaction match.
        // Technically, the correct way to validate this is via branching (efficiently via DP), but given
        // the expected variation space and a desire to avoid complexity, we use this greedy approach.
        for (constraint_index, constraint) in instruction_constraints.iter().enumerate() {
            let constraint_validation_result = {
                if let Some(instruction_with_index) = &instruction {
                    constraint
                        .validate_instruction(
                            self.transaction,
                            instruction_with_index.index,
                            contextual_domain_keys,
                            variation_name,
                            chain_index,
                        )
                        .await
                } else {
                    Err((
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Ran out of instructions while validating constraint {constraint_index} for variation {variation_name}",
                    ),
                ))
                }
            };

            match constraint_validation_result {
                Ok(_) => {
                    instruction = self.remaining_instructions.pop_front();
                }
                Err(e) if constraint.required => {
                    return Err(e);
                }
                Err(_) => {}
            }
        }

        if let Some(InstructionWithIndex {
            index,
            instruction: _,
        }) = instruction
        {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Ran out of constraints while validating instruction {index} for variation {variation_name}",
                ),
            ));
        }

        Ok(())
    }
}
