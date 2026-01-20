use serde::{Deserialize, Serialize};
use serde_with::{serde_as, DisplayFromStr};

use crate::constraint::{
    AccountConstraint, DataConstraint, ParsedDataConstraint, ParsedInstructionConstraint,
    ParsedTransactionVariation, ParsedVariationOrderedInstructionConstraints, SubstantiveProgramId,
    VariationProgramWhitelist,
};

#[derive(Deserialize)]
#[serde(tag = "version")]
pub enum TransactionVariation {
    #[serde(rename = "v0")]
    V0(VariationProgramWhitelist),

    #[serde(rename = "v1")]
    V1(VariationOrderedInstructionConstraints),
}

impl TryFrom<TransactionVariation> for ParsedTransactionVariation {
    type Error = anyhow::Error;

    fn try_from(config: TransactionVariation) -> Result<Self, Self::Error> {
        match config {
            TransactionVariation::V0(v) => Ok(ParsedTransactionVariation::V0(v)),
            TransactionVariation::V1(v) => Ok(ParsedTransactionVariation::V1(v.try_into()?)),
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

impl TryFrom<InstructionConstraint> for ParsedInstructionConstraint {
    type Error = anyhow::Error;

    fn try_from(
        InstructionConstraint {
            program,
            accounts,
            data,
            required,
            requires_wrapped_native_tokens: _,
        }: InstructionConstraint,
    ) -> Result<Self, Self::Error> {
        let parsed_data = data
            .into_iter()
            .map(|constraint| {
                ParsedDataConstraint::from_spec(constraint.start_byte, constraint.constraint)
            })
            .collect::<Result<_, _>>()
            .map_err(|err| anyhow::anyhow!(err))?;

        Ok(ParsedInstructionConstraint {
            program,
            accounts,
            data: parsed_data,
            required,
        })
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

impl TryFrom<VariationOrderedInstructionConstraints>
    for ParsedVariationOrderedInstructionConstraints
{
    type Error = anyhow::Error;

    fn try_from(
        VariationOrderedInstructionConstraints {
            name,
            instructions,
            max_gas_spend,
            paymaster_fee_lamports,
        }: VariationOrderedInstructionConstraints,
    ) -> Result<Self, Self::Error> {
        let mut constraints = Vec::new();
        for base in instructions {
            if base.requires_wrapped_native_tokens {
                constraints
                    .push(ParsedInstructionConstraint::session_wrap_instruction_constraint());
                constraints.push(
                    ParsedInstructionConstraint::create_ata_idempotent_instruction_constraint(),
                );
                constraints.push(ParsedInstructionConstraint::sync_native_instruction_constraint());
                constraints.push(base.try_into()?);
                constraints.push(ParsedInstructionConstraint::close_token_account_constraint());
            } else {
                constraints.push(base.try_into()?);
            }
        }
        Ok(Self {
            name,
            instructions: constraints,
            max_gas_spend,
            paymaster_fee_lamports,
        })
    }
}
