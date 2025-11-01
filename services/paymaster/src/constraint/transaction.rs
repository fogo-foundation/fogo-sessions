use crate::constraint::InstructionConstraint;
use crate::constraint::{compute_gas_spent, ContextualDomainKeys};
use crate::rpc::ChainIndex;
use reqwest::StatusCode;
use solana_message::compiled_instruction::CompiledInstruction;
use solana_transaction::versioned::VersionedTransaction;
use std::collections::VecDeque;
use std::marker::PhantomData;
use std::ops::Deref;

pub struct TransactionToValidate<'a, T: ValidationState> {
    transaction: &'a VersionedTransaction,
    substantive_instructions: VecDeque<InstructionWithIndex<'a>>,
    pub gas_spent: u64,
    _validation_state: PhantomData<T>,
}

impl<'a, T: ValidationState> Deref for TransactionToValidate<'a, T> {
    type Target = VersionedTransaction;

    fn deref(&self) -> &Self::Target {
        self.transaction
    }
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

impl<'a> TransactionToValidate<'a, Unvalidated> {
    pub fn new(transaction: &'a VersionedTransaction) -> Result<Self, (StatusCode, String)> {
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
            gas_spent: compute_gas_spent(transaction)?,
            _validation_state: PhantomData,
        })
    }

    pub fn validate_compute_units(
        self,
        max_gas_spend: u64,
    ) -> Result<TransactionToValidate<'a, ComputeInstructionValidated>, (StatusCode, String)> {
        if self.gas_spent > max_gas_spend {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction gas spend {} exceeds maximum allowed {}",
                    self.gas_spent, max_gas_spend
                ),
            ));
        }
        Ok(TransactionToValidate {
            gas_spent: self.gas_spent,
            transaction: self.transaction,
            substantive_instructions: self.substantive_instructions,
            _validation_state: PhantomData,
        })
    }
}

impl<'a> TransactionToValidate<'a, ComputeInstructionValidated> {
    pub async fn validate_instruction_constraints(
        mut self,
        instruction_constraints: &[InstructionConstraint],
        contextual_domain_keys: &ContextualDomainKeys,
        variation_name: &str,
        chain_index: &ChainIndex,
    ) -> Result<(), (StatusCode, String)> {
        let mut instruction = self.substantive_instructions.pop_front();

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
                            &instruction_with_index,
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
                    instruction = self.substantive_instructions.pop_front();
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
