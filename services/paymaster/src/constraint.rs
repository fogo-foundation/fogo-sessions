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

use crate::{api::ChainIndex, serde::deserialize_pubkey_vec};

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

    #[serde(deserialize_with = "deserialize_pubkey_vec")]
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

fn instruction_matches_program(
    transaction: &VersionedTransaction,
    instruction_index: usize,
    program_to_match: &Pubkey,
) -> anyhow::Result<bool> {
    let instruction = transaction.message.instructions().get(instruction_index);
    if let Some(instruction) = instruction {
        let static_accounts = transaction.message.static_account_keys();
        let program_id = instruction.program_id(static_accounts);
        if program_id == program_to_match {
            return Ok(true);
        }
    } else {
        anyhow::bail!("Instruction index {instruction_index} out of bounds");
    }

    Ok(false)
}

impl VariationOrderedInstructionConstraints {
    pub fn validate_transaction(
        &self,
        transaction: &VersionedTransaction,
        contextual_domain_keys: &ContextualDomainKeys,
        chain_index: &ChainIndex,
    ) -> Result<(), (StatusCode, String)> {
        let mut instruction_index = 0;
        let mut constraint_index = 0;
        check_gas_spend(transaction, self.max_gas_spend)?;

        // Note: this validation algorithm is technically incorrect, because of optional constraints.
        // E.g. instruction i might match against both constraint j and constraint j+1; if constraint j
        // is optional, it might be possible that matching against j leads to failure due to later
        // constraints failing while matching against j+1 would result in a valid transaction match.
        // Technically, the correct way to validate this is via branching (efficiently via DP), but given
        // the expected variation space and a desire to avoid complexity, we use this greedy approach.
        while constraint_index < self.instructions.len() {
            let is_compute_budget_ix = instruction_matches_program(
                transaction,
                instruction_index,
                &solana_compute_budget_interface::id(),
            )
            .unwrap_or(false);

            if is_compute_budget_ix {
                instruction_index += 1;
                continue;
            }

            let constraint = &self.instructions[constraint_index];
            let result = constraint.validate_instruction(
                transaction,
                instruction_index,
                contextual_domain_keys,
                &self.name,
                chain_index,
            );

            if result.is_err() {
                if constraint.required {
                    return result;
                }
                constraint_index += 1;
            } else {
                instruction_index += 1;
                constraint_index += 1;
            }
        }

        if instruction_index != transaction.message.instructions().len() {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Instruction {instruction_index} does not match any expected instruction for variation {}",
                    self.name
                ),
            ));
        }

        Ok(())
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
    pub fn validate_instruction(
        &self,
        transaction: &VersionedTransaction,
        instruction_index: usize,
        contextual_domain_keys: &ContextualDomainKeys,
        variation_name: &str,
        chain_index: &ChainIndex,
    ) -> Result<(), (StatusCode, String)> {
        let instruction = &transaction.message.instructions().get(instruction_index).ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction is missing instruction {instruction_index} for variation {variation_name}",
                ),
            )
        })?;
        let static_accounts = transaction.message.static_account_keys();
        let signatures = &transaction.signatures;

        let program_id = instruction.program_id(static_accounts);
        if *program_id != self.program {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction instruction {instruction_index} program ID {program_id} does not match expected ID {} for variation {variation_name}",
                    self.program,
                ),
            ));
        }

        for (i, account_constraint) in self.accounts.iter().enumerate() {
            let account_index = usize::from(*instruction
                .accounts
                .get(usize::from(account_constraint.index))
                .ok_or_else(|| {
                    (
                        StatusCode::BAD_REQUEST,
                        format!(
                            "Transaction instruction {instruction_index} missing account at index {i} for variation {variation_name}",
                        ),
                    )
                })?);
            let account = if let Some(acc) = static_accounts.get(account_index) {
                acc
            } else if let Some(lookup_tables) = transaction.message.address_table_lookups() {
                let lookup_accounts: Vec<(Pubkey, u8)> = lookup_tables
                    .iter()
                    .flat_map(|x| {
                        x.writable_indexes
                            .clone()
                            .into_iter()
                            .map(|y| (x.account_key, y))
                    })
                    .chain(lookup_tables.iter().flat_map(|x| {
                        x.readonly_indexes
                            .clone()
                            .into_iter()
                            .map(|y| (x.account_key, y))
                    }))
                    .collect();
                let account_position_lookups = account_index - static_accounts.len();
                &chain_index
                    .find_and_query_lookup_table(lookup_accounts, account_position_lookups)?
            } else {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Transaction instruction {instruction_index} account index {account_index} out of bounds for variation {variation_name}",
                    ),
                ));
            };

            let signers = static_accounts
                .iter()
                .take(signatures.len())
                .cloned()
                .collect::<Vec<_>>();
            account_constraint.check_account(
                account,
                signers,
                contextual_domain_keys,
                instruction_index,
            )?;
        }

        for data_constraint in &self.data {
            data_constraint.check_data(&instruction.data, instruction_index)?;
        }

        Ok(())
    }
}

#[derive(Serialize, Deserialize, Clone)]
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
#[derive(Serialize, Deserialize, Clone)]
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

#[derive(Serialize, Deserialize, Clone)]
pub struct DataConstraint {
    pub start_byte: u16,
    pub data_type: PrimitiveDataType,
    pub constraint: DataConstraintSpecification,
}

impl DataConstraint {
    pub fn check_data(
        &self,
        data: &[u8],
        instruction_index: usize,
    ) -> Result<(), (StatusCode, String)> {
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

#[derive(Serialize, Deserialize, Clone)]
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

#[derive(Serialize, Deserialize, Clone)]
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

pub const LAMPORTS_PER_SIGNATURE: u64 = 5000;
pub const DEFAULT_COMPUTE_UNIT_LIMIT: u64 = 200_000;

/// Checks that the transaction's gas spend (signatures + priority fee) does not exceed the maximum allowed.
/// Does not account for spend on account creation or other outlets, since those cannot be determined from the transaction data alone.
pub fn check_gas_spend(
    transaction: &VersionedTransaction,
    max_gas_spend: u64,
) -> Result<(), (StatusCode, String)> {
    let gas_spend = compute_gas_spent(transaction)?;
    if gas_spend > max_gas_spend {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Transaction gas spend {gas_spend} exceeds maximum allowed {max_gas_spend}",),
        ));
    }
    Ok(())
}

/// Computes the priority fee from the transaction's compute budget instructions.
/// Extracts the compute unit price and limit from the instructions. Uses default values if not set.
/// If multiple compute budget instructions are present, the validation will fail.
/// If compute budget instructions have invalid data, the validation will fail.
pub fn process_compute_budget_instructions(
    transaction: &VersionedTransaction,
) -> Result<u64, (StatusCode, String)> {
    let mut cu_limit = None;
    let mut micro_lamports_per_cu = None;

    let msg = &transaction.message;
    let instructions: Vec<&CompiledInstruction> = match msg {
        VersionedMessage::Legacy(m) => m.instructions.iter().collect(),
        VersionedMessage::V0(m) => m.instructions.iter().collect(),
    };

    // should not support multiple compute budget instructions: https://github.com/solana-labs/solana/blob/ca115594ff61086d67b4fec8977f5762e526a457/program-runtime/src/compute_budget.rs#L162
    for ix in instructions {
        if ix.program_id(msg.static_account_keys()) != &solana_compute_budget_interface::id() {
            continue;
        }

        if let Ok(cu_ix) = ComputeBudgetInstruction::try_from_slice(&ix.data) {
            match cu_ix {
                ComputeBudgetInstruction::SetComputeUnitLimit(units) => {
                    if cu_limit.is_some() {
                        return Err((
                            StatusCode::BAD_REQUEST,
                            "Multiple SetComputeUnitLimit instructions found".to_string(),
                        ));
                    }
                    cu_limit = Some(u64::from(units));
                }
                ComputeBudgetInstruction::SetComputeUnitPrice(micro_lamports) => {
                    if micro_lamports_per_cu.is_some() {
                        return Err((
                            StatusCode::BAD_REQUEST,
                            "Multiple SetComputeUnitPrice instructions found".to_string(),
                        ));
                    }
                    micro_lamports_per_cu = Some(micro_lamports);
                }
                _ => {}
            }
        } else {
            return Err((
                StatusCode::BAD_REQUEST,
                "Invalid compute budget instruction data".to_string(),
            ));
        }
    }

    let priority_fee = cu_limit
        .unwrap_or(DEFAULT_COMPUTE_UNIT_LIMIT)
        .saturating_mul(micro_lamports_per_cu.unwrap_or(0))
        / 1_000_000;
    Ok(priority_fee)
}

/// The Solana precompile programs that verify signatures.
pub const PRECOMPILE_SIGNATURE_PROGRAMS: &[Pubkey] = &[
    ed25519_program::ID,
    secp256k1_program::ID,
    secp256r1_program::ID,
];

/// Counts the number of signatures verified by precompile programs in the transaction.
/// Based on core solana fee calc logic: https://github.com/dourolabs/agave/blob/cb32984a9b0d5c2c6f7775bed39b66d3a22e3c46/fee/src/lib.rs#L65-L83
pub fn get_number_precompile_signatures(transaction: &VersionedTransaction) -> u64 {
    transaction.message.instructions().iter().filter(|ix| {
        let program_id = ix.program_id(transaction.message.static_account_keys());
        PRECOMPILE_SIGNATURE_PROGRAMS.contains(program_id)
    })
    .map(|ix| u64::from(ix.data.first().copied().unwrap_or(0)))
    .fold(0u64, |acc, x| acc.saturating_add(x))
}

/// Computes the gas spend (in lamports) for a transaction based on signatures and priority fee.
pub fn compute_gas_spent(transaction: &VersionedTransaction) -> Result<u64, (StatusCode, String)> {
    let n_signatures = (transaction.signatures.len() as u64).saturating_add(get_number_precompile_signatures(transaction));
    let priority_fee = process_compute_budget_instructions(transaction)?;
    Ok((n_signatures.saturating_mul(LAMPORTS_PER_SIGNATURE)).saturating_add(priority_fee))
}
