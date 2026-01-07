use serde::Deserialize;
use serde_with::{serde_as, DisplayFromStr};

use crate::constraint::{
    self, AccountConstraint, DataConstraint, SubstantiveProgramId, VariationProgramWhitelist,
};

#[derive(Deserialize)]
pub enum TransactionVariation {
    #[serde(rename = "v0")]
    V0(VariationProgramWhitelist),

    #[serde(rename = "v1")]
    V1(VariationOrderedInstructionConstraints),
}

impl From<TransactionVariation> for constraint::TransactionVariation {
    fn from(config: TransactionVariation) -> Self {
        match config {
            TransactionVariation::V0(v) => constraint::TransactionVariation::V0(v),
            TransactionVariation::V1(v) => constraint::TransactionVariation::V1(v.into()),
        }
    }
}

#[derive(Deserialize)]
pub struct VariationOrderedInstructionConstraints {
    pub name: String,
    #[serde(default)]
    pub instructions: Vec<InstructionConstraint>,
    pub max_gas_spend: u64,
    pub paymaster_fee_lamports: Option<u64>,
}

#[serde_as]
#[derive(Deserialize)]
pub struct InstructionConstraint {
    #[serde_as(as = "DisplayFromStr")]
    pub program: SubstantiveProgramId,
    #[serde(default)]
    pub accounts: Vec<AccountConstraint>,
    #[serde(default)]
    pub data: Vec<DataConstraint>,
    pub required: bool,
    #[serde(default)]
    pub requires_wrapped_native_tokens: bool,
}

impl From<InstructionConstraint> for constraint::InstructionConstraint {
    fn from(config: InstructionConstraint) -> Self {
        constraint::InstructionConstraint {
            program: config.program,
            accounts: config.accounts,
            data: config.data,
            required: config.required,
        }
    }
}

impl From<VariationOrderedInstructionConstraints>
    for constraint::VariationOrderedInstructionConstraints
{
    fn from(config: VariationOrderedInstructionConstraints) -> Self {
        let constraints = config.instructions
            .into_iter()
            .flat_map(|base| {
                if base.requires_wrapped_native_tokens {
                    vec![
                        constraint::InstructionConstraint::session_wrap_instruction_constraint(),
                        constraint::InstructionConstraint::create_ata_idempotent_instruction_constraint(),
                        constraint::InstructionConstraint::sync_native_instruction_constraint(),
                        base.into(),
                        constraint::InstructionConstraint::close_token_account_constraint(),
                    ]
                } else {
                    vec![base.into()]
                }
            })
            .collect();
        Self {
            name: config.name,
            instructions: constraints,
            max_gas_spend: config.max_gas_spend,
            paymaster_fee_lamports: config.paymaster_fee_lamports,
        }
    }
}
