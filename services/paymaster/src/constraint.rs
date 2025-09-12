use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_with::{serde_as, DisplayFromStr};
use solana_pubkey::Pubkey;

use crate::serde::deserialize_pubkey_vec;

#[derive(Serialize, Deserialize)]
#[serde(tag = "version")]
pub enum TransactionVariation {
    #[serde(rename = "v0")]
    V0(VariationProgramWhitelist),

    #[serde(rename = "v1")]
    V1(VariationOrderedInstructionConstraints),
}

#[derive(Serialize, Deserialize)]
#[serde_as]
pub struct VariationProgramWhitelist {
    pub name: String,

    #[serde(deserialize_with = "deserialize_pubkey_vec")]
    pub whitelisted_programs: Vec<Pubkey>,
}

#[derive(Serialize, Deserialize)]
pub struct VariationOrderedInstructionConstraints {
    pub name: String,
    pub instructions: Vec<InstructionConstraint>,
    pub rate_limits: RateLimits,
    pub max_gas_spend: u64,
}

#[derive(Serialize, Deserialize)]
pub struct RateLimits {
    pub session_per_min: Option<u64>,
    pub ip_per_min: Option<u64>,
}

#[serde_as]
#[derive(Serialize, Deserialize)]
pub struct InstructionConstraint {
    #[serde_as(as = "DisplayFromStr")]
    pub program: Pubkey,
    pub accounts: Vec<AccountConstraint>,
    pub data: Vec<DataConstraint>,
    pub required: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AccountConstraint {
    pub index: u16,
    pub include: Vec<ContextualPubkey>,
    pub exclude: Vec<ContextualPubkey>,
}

#[serde_as]
#[derive(Serialize, Deserialize, Clone)]
pub enum ContextualPubkey {
    Explicit {
        #[serde_as(as = "DisplayFromStr")]
        pubkey: Pubkey,
    },
    Sponsor,
    Signer {
        index: i8,
    },
    DomainRegistry,
}

impl ContextualPubkey {
    pub fn matches_account(
        &self,
        account: &Pubkey,
        signers: &[Pubkey],
        sponsor: &Pubkey,
        domain_registry: &Pubkey,
        expect_include: bool,
        instruction_index: usize,
    ) -> Result<(), (StatusCode, String)> {
        match self {
            ContextualPubkey::Explicit { pubkey } => if expect_include == (account == pubkey) {
                Ok(())
            } else {
                Err((
                    StatusCode::BAD_REQUEST,
                    if expect_include {
                        format!("Instruction {instruction_index}: Account {account} is not explicitly included")
                    } else {
                        format!("Instruction {instruction_index}: Account {account} is explicitly excluded")
                    },
                ))
            },

            ContextualPubkey::Signer { index } => {
                let index_uint = if *index >= 0 {
                    *index as usize
                } else if (-*index as usize) <= signers.len() {
                    signers.len() - (-*index as usize)
                } else {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        format!("Signer index {index} out of bounds"),
                    ));
                };
                match signers.get(index_uint) {
                    Some(signer) => if expect_include == (account == signer) {
                        Ok(())
                    } else {
                        Err((
                            StatusCode::BAD_REQUEST,
                            if expect_include {
                                format!("Instruction {instruction_index}: Account {account} is not the {index}th signer account")
                            } else {
                                format!("Instruction {instruction_index}: Account {account} should be excluded as the {index}th signer")
                            },
                        ))
                    },

                    None => Err((
                        StatusCode::BAD_REQUEST,
                        format!("Signer {index} missing from sessionful transaction"),
                    )),
                }
            }

            ContextualPubkey::Sponsor => if expect_include == (account == sponsor) {
                Ok(())
            } else {
                Err((
                    StatusCode::BAD_REQUEST,
                    if expect_include {
                        format!("Instruction {instruction_index}: Account {account} is not the sponsor account")
                    } else {
                        format!("Instruction {instruction_index}: Account {account} should be excluded as the sponsor account")
                    },
                ))
            },

            ContextualPubkey::DomainRegistry => {
                if expect_include == (account == domain_registry) {
                    Ok(())
                } else {
                    Err((
                        StatusCode::BAD_REQUEST,
                        if expect_include {
                            format!("Instruction {instruction_index}: Account {account} is not the domain registry account")
                        } else {
                            format!("Instruction {instruction_index}: Account {account} should be excluded as the domain registry account")
                        },
                    ))
                }
            }
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DataConstraint {
    pub start_byte: u16,
    pub data_type: PrimitiveDataType,
    pub constraint: DataConstraintSpecification,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum PrimitiveDataType {
    U8,
    U16,
    U32,
    U64,
    Bool,
    Pubkey,
}

impl PrimitiveDataType {
    pub fn byte_length(&self) -> usize {
        match self {
            PrimitiveDataType::U8 => 1,
            PrimitiveDataType::U16 => 2,
            PrimitiveDataType::U32 => 4,
            PrimitiveDataType::U64 => 8,
            PrimitiveDataType::Bool => 1,
            PrimitiveDataType::Pubkey => 32,
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub enum PrimitiveDataValue {
    U8(u8),
    U16(u16),
    U32(u32),
    U64(u64),
    Bool(bool),
    Pubkey(Pubkey),
}

#[derive(Serialize, Deserialize, Clone)]
pub enum DataConstraintSpecification {
    LessThan(PrimitiveDataValue),
    GreaterThan(PrimitiveDataValue),
    EqualTo(Vec<PrimitiveDataValue>),
    Neq(Vec<PrimitiveDataValue>),
}

pub fn compare_primitive_data_types(
    a: PrimitiveDataValue,
    constraint: &DataConstraintSpecification,
) -> Result<(), String> {
    let meets = match constraint {
        DataConstraintSpecification::LessThan(value) => match (a, value) {
            (PrimitiveDataValue::U8(a), PrimitiveDataValue::U8(b)) => a < *b,
            (PrimitiveDataValue::U16(a), PrimitiveDataValue::U16(b)) => a < *b,
            (PrimitiveDataValue::U32(a), PrimitiveDataValue::U32(b)) => a < *b,
            (PrimitiveDataValue::U64(a), PrimitiveDataValue::U64(b)) => a < *b,
            // TODO: catch this error when reading config
            (PrimitiveDataValue::Bool(_), PrimitiveDataValue::Bool(_)) => {
                return Err("LessThan not applicable for bool".into())
            }
            _ => return Err("Incompatible primitive data types".into()),
        },

        DataConstraintSpecification::GreaterThan(value) => match (a, value) {
            (PrimitiveDataValue::U8(a), PrimitiveDataValue::U8(b)) => a > *b,
            (PrimitiveDataValue::U16(a), PrimitiveDataValue::U16(b)) => a > *b,
            (PrimitiveDataValue::U32(a), PrimitiveDataValue::U32(b)) => a > *b,
            (PrimitiveDataValue::U64(a), PrimitiveDataValue::U64(b)) => a > *b,
            // TODO: catch this error when reading config
            (PrimitiveDataValue::Bool(_), PrimitiveDataValue::Bool(_)) => {
                return Err("GreaterThan not applicable for bool".into())
            }
            _ => return Err("Incompatible primitive data types".into()),
        },

        DataConstraintSpecification::EqualTo(values) => {
            for value in values {
                let is_equal = match (&a, value) {
                    (PrimitiveDataValue::U8(a), PrimitiveDataValue::U8(b)) => a == b,
                    (PrimitiveDataValue::U16(a), PrimitiveDataValue::U16(b)) => a == b,
                    (PrimitiveDataValue::U32(a), PrimitiveDataValue::U32(b)) => a == b,
                    (PrimitiveDataValue::U64(a), PrimitiveDataValue::U64(b)) => a == b,
                    (PrimitiveDataValue::Bool(a), PrimitiveDataValue::Bool(b)) => a == b,
                    _ => return Err("Incompatible primitive data types".into()),
                };
                if is_equal {
                    return Ok(());
                }
            }
            return Err("No matching value found".into());
        }

        DataConstraintSpecification::Neq(values) => {
            for value in values {
                let is_equal = match (&a, value) {
                    (PrimitiveDataValue::U8(a), PrimitiveDataValue::U8(b)) => a == b,
                    (PrimitiveDataValue::U16(a), PrimitiveDataValue::U16(b)) => a == b,
                    (PrimitiveDataValue::U32(a), PrimitiveDataValue::U32(b)) => a == b,
                    (PrimitiveDataValue::U64(a), PrimitiveDataValue::U64(b)) => a == b,
                    (PrimitiveDataValue::Bool(a), PrimitiveDataValue::Bool(b)) => a == b,
                    _ => return Err("Incompatible primitive data types".into()),
                };
                if is_equal {
                    return Err("Value matches an excluded value".into());
                }
            }
            return Ok(());
        }
    };

    if meets {
        Ok(())
    } else {
        Err("Constraint not met".into())
    }
}
