use anchor_lang::AnchorDeserialize;
use axum::http::StatusCode;
use fogo_sessions_sdk::tollbooth::TOLLBOOTH_PROGRAM_ID;
use intent_transfer::bridge::processor::bridge_ntt_tokens::{SignedQuote, H160};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_with::{serde_as, DisplayFromStr};
use solana_program::keccak;
use solana_pubkey::{ParsePubkeyError, Pubkey};
use std::fmt::Display;
use std::ops::Deref;
use std::str::FromStr;

use crate::rpc::ChainIndex;
use crate::serde::{deserialize_pubkey_vec, serialize_pubkey_vec};
use transaction::{InstructionWithIndex, TransactionToValidate};

mod fee;
mod gas;
mod templates;

pub mod config;
pub use templates::insert_session_management_variations;
pub mod transaction;

pub enum ParsedTransactionVariation {
    V0(VariationProgramWhitelist),
    V1(ParsedVariationOrderedInstructionConstraints),
}

impl ParsedTransactionVariation {
    pub fn name(&self) -> &str {
        match self {
            ParsedTransactionVariation::V0(v) => &v.name,
            ParsedTransactionVariation::V1(v) => &v.name,
        }
    }

    pub fn swap_into_fogo(&self) -> &[MintSwapRate] {
        match self {
            ParsedTransactionVariation::V0(_) => &[],
            ParsedTransactionVariation::V1(v) => &v.swap_into_fogo,
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
        transaction: &TransactionToValidate<'_>,
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

pub struct ParsedVariationOrderedInstructionConstraints {
    pub name: String,
    pub instructions: Vec<ParsedInstructionConstraint>,
    pub max_gas_spend: u64,
    pub paymaster_fee_lamports: Option<u64>,
    pub swap_into_fogo: Vec<MintSwapRate>,
}

#[derive(Clone)]
pub struct MintSwapRate {
    mint: Pubkey,
    rate: f64,
}

impl MintSwapRate {
    pub fn new(mint: Pubkey, rate: f64) -> Self {
        Self {
            mint,
            rate: rate.clamp(0.0, 1.0),
        }
    }

    pub fn mint(&self) -> Pubkey {
        self.mint
    }

    pub fn rate(&self) -> f64 {
        self.rate
    }
}

#[serde_as]
#[derive(Deserialize)]
struct MintSwapRateRaw {
    #[serde_as(as = "DisplayFromStr")]
    mint: Pubkey,
    rate: f64,
}

impl<'de> serde::Deserialize<'de> for MintSwapRate {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let raw = MintSwapRateRaw::deserialize(deserializer)?;
        Ok(MintSwapRate::new(raw.mint, raw.rate))
    }
}

#[derive(Clone)]
pub struct ContextualDomainKeys {
    pub domain_registry: Pubkey,
    pub sponsor: Pubkey,
}

impl ParsedVariationOrderedInstructionConstraints {
    pub async fn validate_transaction(
        &self,
        transaction: &TransactionToValidate<'_>,
        contextual_domain_keys: &ContextualDomainKeys,
        chain_index: &ChainIndex,
    ) -> Result<(), (StatusCode, String)> {
        self.validate_compute_units(transaction)?;
        self.validate_paymaster_fees(transaction)
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        self.validate_instruction_constraints(transaction, contextual_domain_keys, chain_index)
            .await
    }

    pub fn validate_compute_units(
        &self,
        transaction: &TransactionToValidate<'_>,
    ) -> Result<(), (StatusCode, String)> {
        if transaction.gas_spend > self.max_gas_spend {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction gas spend {} exceeds maximum allowed {}",
                    transaction.gas_spend, self.max_gas_spend
                ),
            ));
        }
        Ok(())
    }

    pub fn validate_paymaster_fees(
        &self,
        transaction: &TransactionToValidate<'_>,
    ) -> anyhow::Result<()> {
        anyhow::ensure!(
            transaction.total_fee_lamports >= self.paymaster_fee_lamports.unwrap_or(0),
            "Paymaster fee is not sufficient"
        );

        Ok(())
    }

    pub async fn validate_instruction_constraints(
        &self,
        transaction: &TransactionToValidate<'_>,
        contextual_domain_keys: &ContextualDomainKeys,
        chain_index: &ChainIndex,
    ) -> Result<(), (StatusCode, String)> {
        let mut substantive_instructions_iterator =
            transaction.substantive_instructions.iter().peekable();

        // Note: this validation algorithm is technically incorrect, because of optional constraints.
        // E.g. instruction i might match against both constraint j and constraint j+1; if constraint j
        // is optional, it might be possible that matching against j leads to failure due to later
        // constraints failing while matching against j+1 would result in a valid transaction match.
        // Technically, the correct way to validate this is via branching (efficiently via DP), but given
        // the expected variation space and a desire to avoid complexity, we use this greedy approach.
        for (constraint_index, constraint) in self.instructions.iter().enumerate() {
            let constraint_validation_result = {
                if let Some(instruction_with_index) = substantive_instructions_iterator.peek() {
                    constraint
                        .validate_instruction(
                            transaction,
                            instruction_with_index,
                            contextual_domain_keys,
                            &self.name,
                            chain_index,
                        )
                        .await
                } else {
                    Err((
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Ran out of instructions while validating constraint {constraint_index} for variation {}",
                        self.name
                    ),
                ))
                }
            };

            match constraint_validation_result {
                Ok(_) => {
                    substantive_instructions_iterator.next();
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
        }) = substantive_instructions_iterator.peek()
        {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Ran out of constraints while validating instruction {index} for variation {}",
                    self.name
                ),
            ));
        }

        Ok(())
    }
}

const NON_SUBSTANTIVE_PROGRAM_IDS: [Pubkey; 2] =
    [solana_compute_budget_interface::id(), TOLLBOOTH_PROGRAM_ID];
pub struct SubstantiveProgramId(Pubkey);

impl Deref for SubstantiveProgramId {
    type Target = Pubkey;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl Display for SubstantiveProgramId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

pub enum ParseSubstantiveProgramIdError {
    NonSubstantiveProgramId(Pubkey),
    ParsePubkeyError(ParsePubkeyError),
}

impl From<ParsePubkeyError> for ParseSubstantiveProgramIdError {
    fn from(error: ParsePubkeyError) -> Self {
        ParseSubstantiveProgramIdError::ParsePubkeyError(error)
    }
}

impl Display for ParseSubstantiveProgramIdError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ParseSubstantiveProgramIdError::NonSubstantiveProgramId(pubkey) => f.write_str(
                format!("The program ID {pubkey} is not allowed to be used in V1 constraints")
                    .as_str(),
            ),
            ParseSubstantiveProgramIdError::ParsePubkeyError(error) => error.fmt(f),
        }
    }
}

impl FromStr for SubstantiveProgramId {
    type Err = ParseSubstantiveProgramIdError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let pubkey = Pubkey::from_str(s)?;
        if NON_SUBSTANTIVE_PROGRAM_IDS.contains(&pubkey) {
            return Err(ParseSubstantiveProgramIdError::NonSubstantiveProgramId(
                pubkey,
            ));
        }
        Ok(SubstantiveProgramId(pubkey))
    }
}

pub struct ParsedInstructionConstraint {
    pub program: SubstantiveProgramId,
    pub accounts: Vec<AccountConstraint>,
    pub data: Vec<ParsedDataConstraint>,
    pub required: bool,
}

impl ParsedInstructionConstraint {
    async fn validate_instruction(
        &self,
        transaction: &TransactionToValidate<'_>,
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
        if program_id != self.program.deref() {
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
                    transaction.message,
                    instruction_with_index,
                    account_constraint.index.into(),
                )
                .await?;

            let signers = static_accounts
                .iter()
                .take(signatures.len())
                .cloned()
                .collect::<Vec<_>>();
            account_constraint
                .check_account(
                    &account_pubkey,
                    signers,
                    contextual_domain_keys,
                    instruction_with_index.index,
                )
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        }

        for data_constraint in &self.data {
            data_constraint
                .check_data(instruction_with_index)
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
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
    fn check_account(
        &self,
        account: &Pubkey,
        signers: Vec<Pubkey>,
        contextual_domain_keys: &ContextualDomainKeys,
        instruction_index: usize,
    ) -> anyhow::Result<()> {
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
                anyhow::bail!("Instruction {instruction_index}: Account {account} does not match any include constraints");
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
    fn matches_account(
        &self,
        account: &Pubkey,
        signers: &[Pubkey],
        contextual_domain_keys: &ContextualDomainKeys,
        expect_include: bool,
        instruction_index: usize,
    ) -> anyhow::Result<()> {
        match self {
            ContextualPubkey::Explicit { pubkey } => {
                if expect_include == (account == pubkey) {
                    Ok(())
                } else {
                    Err(anyhow::anyhow!(if expect_include {
                        format!("Instruction {instruction_index}: Account {account} is not explicitly included")
                    } else {
                        format!("Instruction {instruction_index}: Account {account} is explicitly excluded")
                    },))
                }
            }

            ContextualPubkey::NonFeePayerSigner => {
                if expect_include == (signers.iter().skip(1).any(|s| s == account)) {
                    Ok(())
                } else {
                    Err(anyhow::anyhow!(if expect_include {
                        format!("Instruction {instruction_index}: Account {account} is not a non-fee-payer signer")
                    } else {
                        format!("Instruction {instruction_index}: Account {account} should be excluded as a non-fee-payer signer")
                    },))
                }
            }

            ContextualPubkey::Sponsor => {
                if expect_include == (*account == contextual_domain_keys.sponsor) {
                    Ok(())
                } else {
                    Err(anyhow::anyhow!(if expect_include {
                        format!("Instruction {instruction_index}: Account {account} is not the sponsor account")
                    } else {
                        format!("Instruction {instruction_index}: Account {account} should be excluded as the sponsor account")
                    },))
                }
            }

            ContextualPubkey::DomainRegistry => {
                if expect_include == (*account == contextual_domain_keys.domain_registry) {
                    Ok(())
                } else {
                    Err(anyhow::anyhow!(if expect_include {
                        format!("Instruction {instruction_index}: Account {account} is not the domain registry account")
                    } else {
                        format!("Instruction {instruction_index}: Account {account} should be excluded as the domain registry account")
                    },))
                }
            }
        }
    }
}

pub struct ParsedDataConstraint {
    pub start_byte: u16,
    pub constraint: ParsedDataConstraintSpecification,
}

impl ParsedDataConstraint {
    fn check_data(
        &self,
        InstructionWithIndex {
            index: instruction_index,
            instruction,
        }: &InstructionWithIndex<'_>,
    ) -> anyhow::Result<()> {
        let length = self.constraint.byte_length();
        let end_byte = length + usize::from(self.start_byte);
        if end_byte > instruction.data.len() {
            anyhow::bail!(
                "Instruction {instruction_index}: Data constraint byte range {}-{} is out of bounds for data length {}",
                self.start_byte,
                end_byte - 1,
                instruction.data.len()
            );
        }

        let mut data_to_analyze = instruction
            .data
            .get(usize::from(self.start_byte)..end_byte)
            .expect("We checked instruction.data.length is greater than end_byte");
        let check_result = match &self.constraint {
            ParsedDataConstraintSpecification::Bool(constraint) => {
                let value = *data_to_analyze
                    .first()
                    .expect("data_to_analyze has length 1 if data_type is Bool")
                    != 0;
                constraint.check(value)
            }
            ParsedDataConstraintSpecification::U8(constraint) => {
                let value = *data_to_analyze
                    .first()
                    .expect("data_to_analyze has length 1 if data_type is U8");
                constraint.check(value)
            }
            ParsedDataConstraintSpecification::U16(constraint) => {
                let value = u16::from_le_bytes((*data_to_analyze).try_into().map_err(|_| {
                    anyhow::anyhow!(
                        "Data constraint expects 2 bytes for U16, found {} bytes",
                        data_to_analyze.len()
                    )
                })?);
                constraint.check(value)
            }
            ParsedDataConstraintSpecification::U32(constraint) => {
                let value = u32::from_le_bytes((*data_to_analyze).try_into().map_err(|_| {
                    anyhow::anyhow!(
                        "Data constraint expects 4 bytes for U32, found {} bytes",
                        data_to_analyze.len()
                    )
                })?);
                constraint.check(value)
            }
            ParsedDataConstraintSpecification::U64(constraint) => {
                let value = u64::from_le_bytes((*data_to_analyze).try_into().map_err(|_| {
                    anyhow::anyhow!(
                        "Data constraint expects 8 bytes for U64, found {} bytes",
                        data_to_analyze.len()
                    )
                })?);
                constraint.check(value)
            }
            ParsedDataConstraintSpecification::Pubkey(constraint) => {
                let value =
                    Pubkey::new_from_array((*data_to_analyze).try_into().map_err(|_| {
                        anyhow::anyhow!(
                            "Data constraint expects 32 bytes for Pubkey, found {} bytes",
                            data_to_analyze.len()
                        )
                    })?);
                constraint.check(value)
            }
            ParsedDataConstraintSpecification::Bytes(constraint) => {
                constraint.check(data_to_analyze)
            }
            ParsedDataConstraintSpecification::NttSignedQuoter(constraint) => {
                let signed_quote = SignedQuote::deserialize(&mut data_to_analyze)
                    .map_err(|e| anyhow::anyhow!("Failed to deserialize NTT SignedQuote: {e}"))?;
                let recovered_quoter = recover_signer_pubkey(signed_quote)?;
                constraint.check(NttSignedQuoter(recovered_quoter))
            }
        };
        check_result.map_err(|err| {
            anyhow::anyhow!("Instruction {instruction_index}: Data constraint not satisfied: {err}")
        })?;

        Ok(())
    }
}

pub enum ParsedDataConstraintSpecification {
    U8(IntegerConstraint<u8>),
    U16(IntegerConstraint<u16>),
    U32(IntegerConstraint<u32>),
    U64(IntegerConstraint<u64>),
    Bool(ScalarConstraint<bool>),
    Pubkey(ScalarConstraint<Pubkey>),
    Bytes(BytesConstraint),
    NttSignedQuoter(ScalarConstraint<NttSignedQuoter>),
}

impl ParsedDataConstraintSpecification {
    fn byte_length(&self) -> usize {
        match self {
            ParsedDataConstraintSpecification::U8(_) => 1,
            ParsedDataConstraintSpecification::U16(_) => 2,
            ParsedDataConstraintSpecification::U32(_) => 4,
            ParsedDataConstraintSpecification::U64(_) => 8,
            ParsedDataConstraintSpecification::Bool(_) => 1,
            ParsedDataConstraintSpecification::Pubkey(_) => 32,
            ParsedDataConstraintSpecification::Bytes(BytesConstraint::EqualTo {
                length, ..
            })
            | ParsedDataConstraintSpecification::Bytes(BytesConstraint::Neq { length, .. }) => {
                *length
            }
            ParsedDataConstraintSpecification::NttSignedQuoter(_) => 165,
        }
    }
}

pub enum IntegerConstraint<T> {
    LessThan(T),
    GreaterThan(T),
    EqualTo(Vec<T>),
    Neq(Vec<T>),
}

pub enum ScalarConstraint<T> {
    EqualTo(Vec<T>),
    Neq(Vec<T>),
}

pub enum BytesConstraint {
    EqualTo { length: usize, values: Vec<Vec<u8>> },
    Neq { length: usize, values: Vec<Vec<u8>> },
}

fn recover_signer_pubkey(signed_quote: SignedQuote) -> anyhow::Result<H160> {
    let message_body = signed_quote
        .try_get_message_body()
        .map_err(|e| anyhow::anyhow!("Failed to extract message from signed quote: {e}"))?;

    let message = libsecp256k1::Message::parse(&keccak::hash(&message_body).0);

    let (signature, recovery_index) = signed_quote.try_get_signature_components().map_err(|e| {
        anyhow::anyhow!("Failed to extract signature components from signed quote: {e}")
    })?;
    let sig = libsecp256k1::Signature::parse_standard_slice(signature)
        .map_err(|e| anyhow::anyhow!("Invalid signature: {e}"))?;
    let recovery_id = libsecp256k1::RecoveryId::parse_rpc(recovery_index)
        .map_err(|e| anyhow::anyhow!("Invalid recovery index in signature: {e}"))?;

    let secp_pubkey = libsecp256k1::recover(&message, &sig, &recovery_id)
        .map_err(|e| anyhow::anyhow!("Failed to recover secp256k1 public key: {e}"))?;
    let secp_pubkey_serialized = secp_pubkey.serialize();
    let pubkey_hashed = keccak::hash(
        secp_pubkey_serialized
            .get(1..)
            .expect("Serialized key should be 65 bytes"),
    );
    let evm_address = pubkey_hashed
        .0
        .get(12..)
        .expect("Hash should be 32 bytes")
        .try_into()
        .expect("Slice of 20 bytes should convert to H160");

    if evm_address != signed_quote.header.quoter_address {
        anyhow::bail!("Recovered quoter address does not match stated quoter address");
    };

    Ok(evm_address)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct NttSignedQuoter([u8; 20]);

impl Serialize for NttSignedQuoter {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&format!("0x{}", hex::encode(self.0)))
    }
}

impl<'de> Deserialize<'de> for NttSignedQuoter {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = <String as serde::Deserialize>::deserialize(deserializer)?;
        let hex_part = s.strip_prefix("0x").unwrap_or(&s);
        let bytes = hex::decode(hex_part)
            .map_err(|e| serde::de::Error::custom(format!("Invalid hex string {hex_part}: {e}")))?;
        let arr: [u8; 20] = bytes.try_into().map_err(|_| {
            serde::de::Error::custom(
                "Failed to convert bytes to H160 address: invalid byte array length",
            )
        })?;
        Ok(NttSignedQuoter(arr))
    }
}

impl<T: PartialOrd + PartialEq> IntegerConstraint<T> {
    fn check(&self, value: T) -> anyhow::Result<()> {
        match self {
            IntegerConstraint::LessThan(expected) => {
                if value < *expected {
                    Ok(())
                } else {
                    anyhow::bail!("Constraint not met")
                }
            }
            IntegerConstraint::GreaterThan(expected) => {
                if value > *expected {
                    Ok(())
                } else {
                    anyhow::bail!("Constraint not met")
                }
            }
            IntegerConstraint::EqualTo(values) => check_equal_to(values, |v| v == &value),
            IntegerConstraint::Neq(values) => check_neq(values, |v| v == &value),
        }
    }
}

impl<T: PartialEq> ScalarConstraint<T> {
    fn check(&self, value: T) -> anyhow::Result<()> {
        match self {
            ScalarConstraint::EqualTo(values) => check_equal_to(values, |v| v == &value),
            ScalarConstraint::Neq(values) => check_neq(values, |v| v == &value),
        }
    }
}

impl BytesConstraint {
    fn check(&self, value: &[u8]) -> anyhow::Result<()> {
        match self {
            BytesConstraint::EqualTo { values, .. } => {
                check_equal_to(values, |v| v.as_slice() == value)
            }
            BytesConstraint::Neq { values, .. } => check_neq(values, |v| v.as_slice() == value),
        }
    }
}

fn check_equal_to<T, F>(values: &[T], matches: F) -> anyhow::Result<()>
where
    F: Fn(&T) -> bool,
{
    if values.iter().any(matches) {
        Ok(())
    } else {
        anyhow::bail!("No matching value found")
    }
}

fn check_neq<T, F>(values: &[T], matches: F) -> anyhow::Result<()>
where
    F: Fn(&T) -> bool,
{
    if values.iter().any(matches) {
        anyhow::bail!("Value matches an excluded value")
    } else {
        Ok(())
    }
}
