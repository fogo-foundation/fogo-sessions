use axum::http::StatusCode;
use borsh::BorshDeserialize;
use serde::{Deserialize, Serialize};
use serde_with::{serde_as, DisplayFromStr};
use solana_compute_budget_interface::ComputeBudgetInstruction;
use solana_message::compiled_instruction::CompiledInstruction;
use solana_message::VersionedMessage;
use solana_pubkey::Pubkey;
use solana_sdk_ids::{ed25519_program, secp256k1_program, secp256r1_program};
use solana_transaction::versioned::VersionedTransaction;

use crate::rpc::ChainIndex;
use crate::serde::{deserialize_pubkey_vec, serialize_pubkey_vec};
use transaction::{InstructionWithIndex, TransactionToValidate, Unvalidated};

mod gas;
mod templates;
pub mod transaction;

#[derive(Serialize, Deserialize)]
#[serde(tag = "version")]
pub enum TransactionVariation {
    #[serde(rename = "v0")]
    V0(VariationProgramWhitelist),

    #[serde(rename = "v1")]
    V1(VariationOrderedInstructionConstraints),
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
#[serde_as]
pub struct VariationProgramWhitelist {
    pub name: String,

    #[serde(
        deserialize_with = "deserialize_pubkey_vec",
        serialize_with = "serialize_pubkey_vec"
    )]
    pub whitelisted_programs: Vec<Pubkey>,
}

impl VariationProgramWhitelist {
    pub fn validate_transaction(
        &self,
        transaction: &VersionedTransaction,
    ) -> Result<(), (StatusCode, String)> {
        for instruction in transaction.message.instructions() {
            let program_id = instruction.program_id(transaction.message.static_account_keys());
            if !self.whitelisted_programs.contains(program_id) {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Transaction contains unauthorized program ID {program_id} for variation {}",
                        self.name
                    ),
                ));
            }
        }
        Ok(())
    }
}

#[derive(Serialize, Deserialize)]
pub struct VariationOrderedInstructionConstraints {
    pub name: String,
    #[serde(default)]
    pub instructions: Vec<InstructionConstraint>,
    pub max_gas_spend: u64,
}

pub struct ContextualDomainKeys {
    pub domain_registry: Pubkey,
    pub sponsor: Pubkey,
}

impl VariationOrderedInstructionConstraints {
    pub async fn validate_transaction(
        &self,
        transaction: &TransactionToValidate<'_, Unvalidated>,
        contextual_domain_keys: &ContextualDomainKeys,
        chain_index: &ChainIndex,
    ) -> Result<(), (StatusCode, String)> {
        TransactionToValidate::new(transaction)?
            .validate_compute_units(self.max_gas_spend)?
            .validate_instruction_constraints(
                self.instructions.as_slice(),
                contextual_domain_keys,
                &self.name,
                chain_index,
            )
            .await
    }
}

#[serde_as]
#[derive(Serialize, Deserialize)]
pub struct InstructionConstraint {
    #[serde_as(as = "DisplayFromStr")]
    pub program: Pubkey,
    #[serde(default)]
    pub accounts: Vec<AccountConstraint>,
    #[serde(default)]
    pub data: Vec<DataConstraint>,
    pub required: bool,
}

impl InstructionConstraint {
    pub async fn validate_instruction(
        &self,
        transaction: &VersionedTransaction,
        instruction_with_index: &InstructionWithIndex<'_>,
        contextual_domain_keys: &ContextualDomainKeys,
        variation_name: &str,
        chain_index: &ChainIndex,
    ) -> Result<(), (StatusCode, String)> {
        let static_accounts = transaction.message.static_account_keys();
        let signatures = &transaction.signatures;

        let program_id = instruction_with_index
            .instruction
            .program_id(static_accounts);
        if *program_id != self.program {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction instruction {} program ID {program_id} does not match expected ID {} for variation {variation_name}",
                    instruction_with_index.index,
                    self.program,
                ),
            ));
        }

        for account_constraint in &self.accounts {
            let account_pubkey = chain_index
                .resolve_instruction_account_pubkey(
                    transaction,
                    &instruction_with_index,
                    account_constraint.index.into(),
                )
                .await?;

            let signers = static_accounts
                .iter()
                .take(signatures.len())
                .cloned()
                .collect::<Vec<_>>();
            account_constraint.check_account(
                &account_pubkey,
                signers,
                contextual_domain_keys,
                instruction_with_index.index,
            )?;
        }

        for data_constraint in &self.data {
            data_constraint.check_data(&instruction_with_index)?;
        }

        Ok(())
    }
}

#[derive(Serialize, Deserialize)]
pub struct AccountConstraint {
    pub index: u16,
    #[serde(default)]
    pub include: Vec<ContextualPubkey>,
    #[serde(default)]
    pub exclude: Vec<ContextualPubkey>,
}

impl AccountConstraint {
    pub fn check_account(
        &self,
        account: &Pubkey,
        signers: Vec<Pubkey>,
        contextual_domain_keys: &ContextualDomainKeys,
        instruction_index: usize,
    ) -> Result<(), (StatusCode, String)> {
        // excludes are AND-gated: all excludes must be satisfied
        self.exclude.iter().try_for_each(|excluded| {
            excluded.matches_account(
                account,
                &signers,
                contextual_domain_keys,
                false,
                instruction_index,
            )
        })?;

        // includes are OR-gated: at least one include must be satisfied
        if !self.include.is_empty() {
            let matches_any = self.include.iter().any(|included| {
                included
                    .matches_account(
                        account,
                        &signers,
                        contextual_domain_keys,
                        true,
                        instruction_index,
                    )
                    .is_ok()
            });

            if !matches_any {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Instruction {instruction_index}: Account {account} does not match any include constraints",
                    ),
                ));
            }
        }

        Ok(())
    }
}

#[serde_as]
#[derive(Serialize, Deserialize)]
pub enum ContextualPubkey {
    Explicit {
        #[serde_as(as = "DisplayFromStr")]
        pubkey: Pubkey,
    },
    Sponsor,
    NonFeePayerSigner,
    DomainRegistry,
}

impl ContextualPubkey {
    pub fn matches_account(
        &self,
        account: &Pubkey,
        signers: &[Pubkey],
        contextual_domain_keys: &ContextualDomainKeys,
        expect_include: bool,
        instruction_index: usize,
    ) -> Result<(), (StatusCode, String)> {
        match self {
            ContextualPubkey::Explicit { pubkey } => {
                if expect_include == (account == pubkey) {
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
                }
            }

            ContextualPubkey::NonFeePayerSigner => {
                if expect_include == (signers.iter().skip(1).any(|s| s == account)) {
                    Ok(())
                } else {
                    Err((
                        StatusCode::BAD_REQUEST,
                        if expect_include {
                            format!("Instruction {instruction_index}: Account {account} is not a non-fee-payer signer")
                        } else {
                            format!("Instruction {instruction_index}: Account {account} should be excluded as a non-fee-payer signer")
                        },
                    ))
                }
            }

            ContextualPubkey::Sponsor => {
                if expect_include == (*account == contextual_domain_keys.sponsor) {
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
                }
            }

            ContextualPubkey::DomainRegistry => {
                if expect_include == (*account == contextual_domain_keys.domain_registry) {
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

#[derive(Serialize, Deserialize)]
pub struct DataConstraint {
    pub start_byte: u16,
    pub data_type: PrimitiveDataType,
    pub constraint: DataConstraintSpecification,
}

impl DataConstraint {
    pub fn check_data(
        &self,
        instruction_with_index: &InstructionWithIndex<'_>,
    ) -> Result<(), (StatusCode, String)> {
        let instruction_index = instruction_with_index.index;
        let data = &instruction_with_index.instruction.data;
        let length = self.data_type.byte_length();
        let end_byte = length + usize::from(self.start_byte);
        if end_byte > data.len() {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Instruction {instruction_index}: Data constraint byte range {}-{} is out of bounds for data length {}",
                    self.start_byte,
                    end_byte - 1,
                    data.len()
                ),
            ));
        }

        let data_to_analyze = &data[usize::from(self.start_byte)..end_byte];
        let data_to_analyze_deserialized = match self.data_type {
            PrimitiveDataType::Bool => PrimitiveDataValue::Bool(data_to_analyze[0] != 0),
            PrimitiveDataType::U8 => PrimitiveDataValue::U8(data_to_analyze[0]),
            PrimitiveDataType::U16 => {
                let data_u16 = u16::from_le_bytes(data_to_analyze.try_into().map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        format!(
                            "Instruction {instruction_index}: Data constraint expects 2 bytes for U16, found {} bytes",
                            data_to_analyze.len()
                        ),
                    )
                })?);
                PrimitiveDataValue::U16(data_u16)
            }

            PrimitiveDataType::U32 => {
                let data_u32 = u32::from_le_bytes(data_to_analyze.try_into().map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        format!(
                            "Instruction {instruction_index}: Data constraint expects 4 bytes for U32, found {} bytes",
                            data_to_analyze.len()
                        ),
                    )
                })?);
                PrimitiveDataValue::U32(data_u32)
            }

            PrimitiveDataType::U64 => {
                let data_u64 = u64::from_le_bytes(data_to_analyze.try_into().map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        format!(
                            "Instruction {instruction_index}: Data constraint expects 8 bytes for U64, found {} bytes",
                            data_to_analyze.len()
                        ),
                    )
                })?);
                PrimitiveDataValue::U64(data_u64)
            }

            PrimitiveDataType::Pubkey => {
                let data_pubkey = Pubkey::new_from_array(data_to_analyze.try_into().map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        format!(
                            "Instruction {instruction_index}: Data constraint expects 32 bytes for Pubkey, found {} bytes",
                            data_to_analyze.len()
                        ),
                    )
                })?);
                PrimitiveDataValue::Pubkey(data_pubkey)
            }

            PrimitiveDataType::Bytes {
                length: expected_length,
            } => {
                if data_to_analyze.len() != expected_length {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        format!(
                            "Instruction {instruction_index}: Data constraint expects {expected_length} bytes for Bytes, found {} bytes",
                            data_to_analyze.len()
                        ),
                    ));
                }
                let data_to_analyze_string = hex::encode(data_to_analyze);
                PrimitiveDataValue::Bytes(data_to_analyze_string)
            }
        };

        compare_primitive_data_types(data_to_analyze_deserialized, &self.constraint).map_err(
            |err| {
                (
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Instruction {instruction_index}: Data constraint not satisfied: {err}"
                    ),
                )
            },
        )?;

        Ok(())
    }
}

#[derive(Serialize, Deserialize)]
pub enum PrimitiveDataType {
    U8,
    U16,
    U32,
    U64,
    Bool,
    Pubkey,
    /// Fixed-size byte array
    Bytes {
        length: usize,
    },
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
            PrimitiveDataType::Bytes { length } => *length,
        }
    }
}

#[derive(Serialize, Deserialize)]
pub enum PrimitiveDataValue {
    U8(u8),
    U16(u16),
    U32(u32),
    U64(u64),
    Bool(bool),
    Pubkey(Pubkey),
    /// Fixed-size byte array specified as hex-encoded string
    Bytes(String),
}

#[derive(Serialize, Deserialize)]
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
            (PrimitiveDataValue::Pubkey(_), PrimitiveDataValue::Pubkey(_)) => {
                return Err("LessThan not applicable for pubkey".into())
            }
            (PrimitiveDataValue::Bytes(_), PrimitiveDataValue::Bytes(_)) => {
                return Err("LessThan not applicable for bytes".into())
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
            (PrimitiveDataValue::Pubkey(_), PrimitiveDataValue::Pubkey(_)) => {
                return Err("GreaterThan not applicable for pubkey".into())
            }
            (PrimitiveDataValue::Bytes(_), PrimitiveDataValue::Bytes(_)) => {
                return Err("GreaterThan not applicable for bytes".into())
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
                    (PrimitiveDataValue::Pubkey(a), PrimitiveDataValue::Pubkey(b)) => a == b,
                    (PrimitiveDataValue::Bytes(a), PrimitiveDataValue::Bytes(b)) => a == b,
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
                    (PrimitiveDataValue::Pubkey(a), PrimitiveDataValue::Pubkey(b)) => a == b,
                    (PrimitiveDataValue::Bytes(a), PrimitiveDataValue::Bytes(b)) => a == b,
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
