use serde::{Deserialize, Serialize};
use serde_with::{serde_as, DisplayFromStr};
use solana_pubkey::Pubkey;

use crate::constraint::{
    AccountConstraint, BytesConstraint, IntegerConstraint, MintSwapRate, NttSignedQuoter,
    ParsedDataConstraint, ParsedDataConstraintSpecification, ParsedInstructionConstraint,
    ParsedTransactionVariation, ParsedVariationOrderedInstructionConstraints, ScalarConstraint,
    SubstantiveProgramId, VariationProgramWhitelist,
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

#[derive(Serialize, Deserialize)]
pub enum DataValue {
    U8(u8),
    U16(u16),
    U32(u32),
    U64(u64),
    Bool(bool),
    Pubkey(Pubkey),
    /// Fixed-size byte array specified as hex-encoded string
    Bytes(String),
    /// NTT quoter
    NttSignedQuoter(NttSignedQuoter),
}

impl TryFrom<DataConstraint> for ParsedDataConstraint {
    type Error = anyhow::Error;
    fn try_from(data_constraint: DataConstraint) -> Result<Self, Self::Error> {
        let constraint = ParsedDataConstraintSpecification::try_from(data_constraint.constraint)?;
        Ok(Self {
            start_byte: data_constraint.start_byte,
            constraint,
        })
    }
}

#[derive(Serialize, Deserialize)]
pub enum DataConstraintSpecification {
    LessThan(DataValue),
    GreaterThan(DataValue),
    EqualTo(Vec<DataValue>),
    Neq(Vec<DataValue>),
}

impl TryFrom<DataConstraintSpecification> for ParsedDataConstraintSpecification {
    type Error = anyhow::Error;
    fn try_from(spec: DataConstraintSpecification) -> Result<Self, Self::Error> {
        match spec {
            DataConstraintSpecification::LessThan(value) => match value {
                DataValue::U8(v) => Ok(ParsedDataConstraintSpecification::U8(
                    IntegerConstraint::LessThan(v),
                )),
                DataValue::U16(v) => Ok(ParsedDataConstraintSpecification::U16(
                    IntegerConstraint::LessThan(v),
                )),
                DataValue::U32(v) => Ok(ParsedDataConstraintSpecification::U32(
                    IntegerConstraint::LessThan(v),
                )),
                DataValue::U64(v) => Ok(ParsedDataConstraintSpecification::U64(
                    IntegerConstraint::LessThan(v),
                )),
                _ => anyhow::bail!(
                    "LessThan constraints are only supported for unsigned integer types"
                ),
            },
            DataConstraintSpecification::GreaterThan(value) => match value {
                DataValue::U8(v) => Ok(ParsedDataConstraintSpecification::U8(
                    IntegerConstraint::GreaterThan(v),
                )),
                DataValue::U16(v) => Ok(ParsedDataConstraintSpecification::U16(
                    IntegerConstraint::GreaterThan(v),
                )),
                DataValue::U32(v) => Ok(ParsedDataConstraintSpecification::U32(
                    IntegerConstraint::GreaterThan(v),
                )),
                DataValue::U64(v) => Ok(ParsedDataConstraintSpecification::U64(
                    IntegerConstraint::GreaterThan(v),
                )),
                _ => anyhow::bail!(
                    "GreaterThan constraints are only supported for unsigned integer types"
                ),
            },
            DataConstraintSpecification::EqualTo(values) => parse_exact_match_values(values, true),
            DataConstraintSpecification::Neq(values) => parse_exact_match_values(values, false),
        }
    }
}

fn parse_exact_match_values(
    values: Vec<DataValue>,
    is_equal: bool,
) -> anyhow::Result<ParsedDataConstraintSpecification> {
    let first = values.first().ok_or_else(|| {
        anyhow::anyhow!("EqualTo/Neq constraints must include at least one value")
    })?;
    match first {
        DataValue::U8(_) => {
            let parsed = extract_values(values, |value| match value {
                DataValue::U8(v) => Some(v),
                _ => None,
            })?;
            Ok(ParsedDataConstraintSpecification::U8(if is_equal {
                IntegerConstraint::EqualTo(parsed)
            } else {
                IntegerConstraint::Neq(parsed)
            }))
        }
        DataValue::U16(_) => {
            let parsed = extract_values(values, |value| match value {
                DataValue::U16(v) => Some(v),
                _ => None,
            })?;
            Ok(ParsedDataConstraintSpecification::U16(if is_equal {
                IntegerConstraint::EqualTo(parsed)
            } else {
                IntegerConstraint::Neq(parsed)
            }))
        }
        DataValue::U32(_) => {
            let parsed = extract_values(values, |value| match value {
                DataValue::U32(v) => Some(v),
                _ => None,
            })?;
            Ok(ParsedDataConstraintSpecification::U32(if is_equal {
                IntegerConstraint::EqualTo(parsed)
            } else {
                IntegerConstraint::Neq(parsed)
            }))
        }
        DataValue::U64(_) => {
            let parsed = extract_values(values, |value| match value {
                DataValue::U64(v) => Some(v),
                _ => None,
            })?;
            Ok(ParsedDataConstraintSpecification::U64(if is_equal {
                IntegerConstraint::EqualTo(parsed)
            } else {
                IntegerConstraint::Neq(parsed)
            }))
        }
        DataValue::Bool(_) => {
            let parsed = extract_values(values, |value| match value {
                DataValue::Bool(v) => Some(v),
                _ => None,
            })?;
            Ok(ParsedDataConstraintSpecification::Bool(if is_equal {
                ScalarConstraint::EqualTo(parsed)
            } else {
                ScalarConstraint::Neq(parsed)
            }))
        }
        DataValue::Pubkey(_) => {
            let parsed = extract_values(values, |value| match value {
                DataValue::Pubkey(v) => Some(v),
                _ => None,
            })?;
            Ok(ParsedDataConstraintSpecification::Pubkey(if is_equal {
                ScalarConstraint::EqualTo(parsed)
            } else {
                ScalarConstraint::Neq(parsed)
            }))
        }
        DataValue::Bytes(value) => {
            let first_value = decode_hex_bytes(value)?;
            let values = extract_bytes(values, first_value.len())?;
            Ok(ParsedDataConstraintSpecification::Bytes(if is_equal {
                BytesConstraint::EqualTo {
                    length: first_value.len(),
                    values,
                }
            } else {
                BytesConstraint::Neq {
                    length: first_value.len(),
                    values,
                }
            }))
        }
        DataValue::NttSignedQuoter(_) => {
            let parsed = extract_values(values, |value| match value {
                DataValue::NttSignedQuoter(v) => Some(v),
                _ => None,
            })?;
            Ok(ParsedDataConstraintSpecification::NttSignedQuoter(
                if is_equal {
                    ScalarConstraint::EqualTo(parsed)
                } else {
                    ScalarConstraint::Neq(parsed)
                },
            ))
        }
    }
}

fn extract_values<T, F>(values: Vec<DataValue>, mapper: F) -> anyhow::Result<Vec<T>>
where
    F: Fn(DataValue) -> Option<T>,
{
    values
        .into_iter()
        .map(|value| {
            mapper(value).ok_or_else(|| {
                anyhow::anyhow!("EqualTo/Neq constraint contains elements of different types")
            })
        })
        .collect()
}

fn extract_bytes(values: Vec<DataValue>, expected_length: usize) -> anyhow::Result<Vec<Vec<u8>>> {
    values
        .into_iter()
        .map(|value| match value {
            DataValue::Bytes(value) => {
                let bytes = decode_hex_bytes(&value)?;
                if bytes.len() != expected_length {
                    anyhow::bail!(
                        "Multiple Bytes values in an EqualTo/Neq constraint must all have the same length. Expected {expected_length} bytes, got {}",
                        bytes.len()
                    );
                }
                Ok(bytes)
            }
            _ => anyhow::bail!("EqualTo/Neq constraint contains elements of different types"),
        })
        .collect::<anyhow::Result<Vec<Vec<u8>>>>()
}

fn decode_hex_bytes(value: &str) -> anyhow::Result<Vec<u8>> {
    let hex_part = value.strip_prefix("0x").unwrap_or(value);
    hex::decode(hex_part).map_err(|e| anyhow::anyhow!("Invalid hex string {hex_part}: {e}"))
}

#[derive(Serialize, Deserialize)]
pub struct DataConstraint {
    pub start_byte: u16,
    pub constraint: DataConstraintSpecification,
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
            .map(ParsedDataConstraint::try_from)
            .collect::<Result<_, _>>()?;
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
    #[serde(default)]
    pub swap_into_fogo: Vec<MintSwapRate>,
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
            swap_into_fogo,
        }: VariationOrderedInstructionConstraints,
    ) -> Result<Self, Self::Error> {
        let constraints = instructions
            .into_iter()
            .map(|base| {
                if base.requires_wrapped_native_tokens {
                    Ok(vec![
                        ParsedInstructionConstraint::session_wrap_instruction_constraint(),
                        ParsedInstructionConstraint::create_ata_idempotent_instruction_constraint(),
                        ParsedInstructionConstraint::sync_native_instruction_constraint(),
                        base.try_into()?,
                        ParsedInstructionConstraint::close_token_account_constraint(),
                    ])
                } else {
                    Ok(vec![base.try_into()?])
                }
            })
            .collect::<anyhow::Result<Vec<_>>>()?
            .into_iter()
            .flatten()
            .collect();
        let parsed_swap_into_fogo = swap_into_fogo
            .into_iter()
            .filter(|MintSwapRate { rate, .. }| *rate != 0.0)
            .collect();
        Ok(Self {
            name,
            instructions: constraints,
            max_gas_spend,
            paymaster_fee_lamports,
            swap_into_fogo: parsed_swap_into_fogo,
        })
    }
}
