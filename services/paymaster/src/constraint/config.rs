use serde::{Deserialize, Serialize};
use serde_with::{serde_as, DisplayFromStr};

use crate::constraint::{
    AccountConstraint, DataConstraint, ParsedInstructionConstraint, ParsedTransactionVariation,
    ParsedVariationOrderedInstructionConstraints, SubstantiveProgramId, VariationProgramWhitelist,
};

#[derive(Deserialize)]
#[serde(tag = "version")]
pub enum TransactionVariation {
    #[serde(rename = "v0")]
    V0(VariationProgramWhitelist),

    #[serde(rename = "v1")]
    V1(VariationOrderedInstructionConstraints),
}

impl From<TransactionVariation> for ParsedTransactionVariation {
    fn from(config: TransactionVariation) -> Self {
        match config {
            TransactionVariation::V0(v) => ParsedTransactionVariation::V0(v),
            TransactionVariation::V1(v) => ParsedTransactionVariation::V1(v.into()),
        }
    }
}

impl TransactionVariation {
    pub fn name(&self) -> &str {
        match self {
            TransactionVariation::V0(v) => &v.name,
            TransactionVariation::V1(v) => &v.name,
        }
    }
}

#[serde_as]
#[derive(Deserialize, Serialize)]
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

impl From<InstructionConstraint> for ParsedInstructionConstraint {
    fn from(
        InstructionConstraint {
            program,
            accounts,
            data,
            required,
            requires_wrapped_native_tokens: _,
        }: InstructionConstraint,
    ) -> Self {
        ParsedInstructionConstraint {
            program,
            accounts,
            data,
            required,
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

impl From<VariationOrderedInstructionConstraints> for ParsedVariationOrderedInstructionConstraints {
    fn from(
        VariationOrderedInstructionConstraints {
            name,
            instructions,
            max_gas_spend,
            paymaster_fee_lamports,
        }: VariationOrderedInstructionConstraints,
    ) -> Self {
        let constraints = instructions
            .into_iter()
            .flat_map(|base| {
                if base.requires_wrapped_native_tokens {
                    vec![
                        ParsedInstructionConstraint::session_wrap_instruction_constraint(),
                        ParsedInstructionConstraint::create_ata_idempotent_instruction_constraint(),
                        ParsedInstructionConstraint::sync_native_instruction_constraint(),
                        base.into(),
                        ParsedInstructionConstraint::close_token_account_constraint(),
                    ]
                } else {
                    vec![base.into()]
                }
            })
            .collect();
        Self {
            name,
            instructions: constraints,
            max_gas_spend,
            paymaster_fee_lamports,
        }
    }
}
