use anchor_lang::AnchorDeserialize;
use serde::{Deserialize, Serialize};
use serde_with::{serde_as, DisplayFromStr};
use solana_pubkey::Pubkey;

use crate::constraint::{
    AccountConstraint, BytesConstraint, IntegerConstraint, NttSignedQuoter, ParsedDataConstraint, ParsedDataConstraintSpecification, ParsedInstructionConstraint, ParsedTransactionVariation, ParsedVariationOrderedInstructionConstraints, ScalarConstraint, SubstantiveProgramId, VariationProgramWhitelist
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
        let kind = ParsedDataConstraintSpecification::try_from(data_constraint.constraint)?;
        Ok(Self {
            start_byte: data_constraint.start_byte,
            kind,
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
                DataValue::U8(v) => {
                    Ok(ParsedDataConstraintSpecification::U8(IntegerConstraint::LessThan(v)))
                }
                DataValue::U16(v) => Ok(ParsedDataConstraintSpecification::U16(
                    IntegerConstraint::LessThan(v),
                )),
                DataValue::U32(v) => Ok(ParsedDataConstraintSpecification::U32(
                    IntegerConstraint::LessThan(v),
                )),
                DataValue::U64(v) => Ok(ParsedDataConstraintSpecification::U64(
                    IntegerConstraint::LessThan(v),
                )),
                _ => anyhow::bail!("LessThan constraints only support unsigned integer types"),
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
                _ => anyhow::bail!("GreaterThan constraints only support unsigned integer types"),
            },
            DataConstraintSpecification::EqualTo(values) => parse_equal_values(values, true),
            DataConstraintSpecification::Neq(values) => parse_equal_values(values, false),
        }
    }
}

fn parse_equal_values(
    values: Vec<DataValue>,
    is_equal: bool,
) -> Result<ParsedDataConstraintSpecification, anyhow::Error> {
    let first = values.first().ok_or_else(|| {
        anyhow::anyhow!("EqualTo/Neq constraints must include at least one value")
    })?;
    match first {
        DataValue::U8(_) => {
            let parsed = into_u8s(values)?;
            Ok(ParsedDataConstraintSpecification::U8(if is_equal {
                IntegerConstraint::EqualTo(parsed)
            } else {
                IntegerConstraint::Neq(parsed)
            }))
        }
        DataValue::U16(_) => {
            let parsed = into_u16s(values)?;
            Ok(ParsedDataConstraintSpecification::U16(if is_equal {
                IntegerConstraint::EqualTo(parsed)
            } else {
                IntegerConstraint::Neq(parsed)
            }))
        }
        DataValue::U32(_) => {
            let parsed = into_u32s(values)?;
            Ok(ParsedDataConstraintSpecification::U32(if is_equal {
                IntegerConstraint::EqualTo(parsed)
            } else {
                IntegerConstraint::Neq(parsed)
            }))
        }
        DataValue::U64(_) => {
            let parsed = into_u64s(values)?;
            Ok(ParsedDataConstraintSpecification::U64(if is_equal {
                IntegerConstraint::EqualTo(parsed)
            } else {
                IntegerConstraint::Neq(parsed)
            }))
        }
        DataValue::Bool(_) => {
            let parsed = into_bools(values)?;
            Ok(ParsedDataConstraintSpecification::Bool(if is_equal {
                ScalarConstraint::EqualTo(parsed)
            } else {
                ScalarConstraint::Neq(parsed)
            }))
        }
        DataValue::Pubkey(_) => {
            let parsed = into_pubkeys(values)?;
            Ok(ParsedDataConstraintSpecification::Pubkey(if is_equal {
                ScalarConstraint::EqualTo(parsed)
            } else {
                ScalarConstraint::Neq(parsed)
            }))
        }
        DataValue::Bytes(_) => {
            let (length, parsed) = into_bytes(values)?;
            Ok(ParsedDataConstraintSpecification::Bytes(if is_equal {
                BytesConstraint::EqualTo {
                    length,
                    values: parsed,
                }
            } else {
                BytesConstraint::Neq {
                    length,
                    values: parsed,
                }
            }))
        }
        DataValue::NttSignedQuoter(_) => {
            let parsed = into_ntt_signed_quoters(values)?;
            Ok(ParsedDataConstraintSpecification::NttSignedQuoter(if is_equal {
                ScalarConstraint::EqualTo(parsed)
            } else {
                ScalarConstraint::Neq(parsed)
            }))
        }
    }
}

fn into_u8s(values: Vec<DataValue>) -> Result<Vec<u8>, anyhow::Error> {
    values
        .into_iter()
        .map(|value| match value {
            DataValue::U8(v) => Ok(v),
            _ => anyhow::bail!("Incompatible primitive data types"),
        })
        .collect()
}

fn into_u16s(values: Vec<DataValue>) -> Result<Vec<u16>, anyhow::Error> {
    values
        .into_iter()
        .map(|value| match value {
            DataValue::U16(v) => Ok(v),
            _ => anyhow::bail!("Incompatible primitive data types"),
        })
        .collect()
}

fn into_u32s(values: Vec<DataValue>) -> Result<Vec<u32>, anyhow::Error> {
    values
        .into_iter()
        .map(|value| match value {
            DataValue::U32(v) => Ok(v),
            _ => anyhow::bail!("Incompatible primitive data types"),
        })
        .collect()
}

fn into_u64s(values: Vec<DataValue>) -> Result<Vec<u64>, anyhow::Error> {
    values
        .into_iter()
        .map(|value| match value {
            DataValue::U64(v) => Ok(v),
            _ => anyhow::bail!("Incompatible primitive data types"),
        })
        .collect()
}

fn into_bools(values: Vec<DataValue>) -> Result<Vec<bool>, anyhow::Error> {
    values
        .into_iter()
        .map(|value| match value {
            DataValue::Bool(v) => Ok(v),
            _ => anyhow::bail!("Incompatible primitive data types"),
        })
        .collect()
}

fn into_pubkeys(values: Vec<DataValue>) -> Result<Vec<Pubkey>, anyhow::Error> {
    values
        .into_iter()
        .map(|value| match value {
            DataValue::Pubkey(v) => Ok(v),
            _ => anyhow::bail!("Incompatible primitive data types"),
        })
        .collect()
}

fn into_ntt_signed_quoters(values: Vec<DataValue>) -> Result<Vec<NttSignedQuoter>, anyhow::Error> {
    values
        .into_iter()
        .map(|value| match value {
            DataValue::NttSignedQuoter(v) => Ok(v),
            _ => anyhow::bail!("Incompatible primitive data types"),
        })
        .collect()
}

fn into_bytes(values: Vec<DataValue>) -> Result<(usize, Vec<Vec<u8>>), anyhow::Error> {
    let mut iter = values.into_iter();
    let first = iter.next().ok_or_else(|| {
        anyhow::anyhow!("EqualTo/Neq constraints must include at least one value")
    })?;
    let first_bytes = match first {
        DataValue::Bytes(value) => decode_hex_bytes(&value)?,
        _ => anyhow::bail!("Incompatible primitive data types"),
    };
    let expected_length = first_bytes.len();
    let mut parsed = vec![first_bytes];
    for value in iter {
        let bytes = match value {
            DataValue::Bytes(value) => decode_hex_bytes(&value)?,
            _ => anyhow::bail!("Incompatible primitive data types"),
        };
        if bytes.len() != expected_length {
            anyhow::bail!("Bytes constraints must use values with matching lengths (expected {expected_length}, got {})", bytes.len());
        }
        parsed.push(bytes);
    }
    Ok((expected_length, parsed))
}

fn decode_hex_bytes(value: &str) -> Result<Vec<u8>, anyhow::Error> {
    let hex_part = value.strip_prefix("0x").unwrap_or(value);
    if hex_part.len() % 2 != 0 {
        anyhow::bail!("Bytes constraints must use an even-length hex string");
    }
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
                constraints.extend(vec![
                    ParsedInstructionConstraint::session_wrap_instruction_constraint(),
                    ParsedInstructionConstraint::create_ata_idempotent_instruction_constraint(),
                    ParsedInstructionConstraint::sync_native_instruction_constraint(),
                ]);
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
