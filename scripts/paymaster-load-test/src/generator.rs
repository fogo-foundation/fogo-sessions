use crate::config::ValidityType;
use anyhow::Result;
use chain_id::ID as CHAIN_ID_PID;
use fogo_sessions_sdk::domain_registry::get_domain_record_address;
use fogo_sessions_sdk::session::SESSION_MANAGER_ID;
use solana_compute_budget_interface::ComputeBudgetInstruction;
use solana_hash::Hash;
use solana_keypair::Keypair;
use solana_message::{v0, VersionedMessage};
use solana_program::{
    ed25519_program,
    instruction::{AccountMeta, Instruction},
};
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

pub struct TransactionGenerator {
    sponsor_pubkey: Pubkey,

    // wallet keypair of user (used to sign intents)
    user_signer: Keypair,

    chain_id: String,

    domain: String,
}

impl TransactionGenerator {
    pub fn new(
        sponsor_pubkey: Pubkey,
        chain_id: impl Into<String>,
        domain: impl Into<String>,
    ) -> Self {
        Self {
            sponsor_pubkey,
            user_signer: Keypair::new(),
            chain_id: chain_id.into(),
            domain: domain.into(),
        }
    }

    /// Generate a transaction based on validity type
    pub fn generate(
        &self,
        validity_type: ValidityType,
        blockhash: Hash,
    ) -> Result<VersionedTransaction> {
        match validity_type {
            ValidityType::Valid => self.generate_valid(blockhash),
            ValidityType::InvalidSignature => self.generate_invalid_signature(blockhash),
            ValidityType::InvalidConstraint => self.generate_invalid_constraint(blockhash),
            ValidityType::InvalidFeePayer => self.generate_invalid_fee_payer(blockhash),
            ValidityType::InvalidGas => self.generate_invalid_gas(blockhash),
        }
    }

    /// Generate a valid transaction
    fn generate_valid(&self, blockhash: Hash) -> Result<VersionedTransaction> {
        let (instructions, session_keypair) = self.build_session_establishment_instructions()?;

        let message =
            v0::Message::try_compile(&self.sponsor_pubkey, &instructions, &[], blockhash)?;

        let mut tx = VersionedTransaction {
            signatures: vec![Default::default(); 2],
            message: VersionedMessage::V0(message),
        };

        // sign with session keypair only (sponsor signature will be added by paymaster)
        Self::sign_transaction(&mut tx, &[&session_keypair]);

        Ok(tx)
    }

    fn sign_transaction(tx: &mut VersionedTransaction, signers: &[&Keypair]) {
        let message_bytes = tx.message.serialize();
        for (i, signer) in signers.iter().enumerate() {
            let signature = signer.sign_message(&message_bytes);

            // skip the first signature slot (reserved for sponsor)
            if i + 1 < tx.signatures.len() {
                tx.signatures[i + 1] = signature;
            }
        }
    }

    /// Generate transaction with invalid signature (wrong keypair)
    fn generate_invalid_signature(&self, blockhash: Hash) -> Result<VersionedTransaction> {
        let (instructions, _session_keypair) = self.build_session_establishment_instructions()?;

        let message =
            v0::Message::try_compile(&self.sponsor_pubkey, &instructions, &[], blockhash)?;

        let mut tx = VersionedTransaction {
            signatures: vec![Default::default(); 2],
            message: VersionedMessage::V0(message),
        };

        // sign with a wrong keypair instead of the correct session keypair
        let wrong_keypair = Keypair::new();
        Self::sign_transaction(&mut tx, &[&wrong_keypair]);

        Ok(tx)
    }

    /// Generate transaction that violates constraints
    fn generate_invalid_constraint(&self, blockhash: Hash) -> Result<VersionedTransaction> {
        // create a transaction with an instruction to a random program that is not whitelisted
        let random_program_id = Pubkey::new_unique();
        let invalid_instruction = Instruction {
            program_id: random_program_id,
            accounts: vec![],
            data: vec![],
        };

        let instructions = vec![invalid_instruction];

        let message =
            v0::Message::try_compile(&self.sponsor_pubkey, &instructions, &[], blockhash)?;

        let tx = VersionedTransaction {
            signatures: vec![Default::default(); 1], // only sponsor (fee payer)
            message: VersionedMessage::V0(message),
        };

        Ok(tx)
    }

    /// Generate transaction with wrong fee payer
    fn generate_invalid_fee_payer(&self, blockhash: Hash) -> Result<VersionedTransaction> {
        let (instructions, session_keypair) = self.build_session_establishment_instructions()?;

        // use user as fee payer instead of sponsor (this should be rejected by paymaster)
        let message =
            v0::Message::try_compile(&self.user_signer.pubkey(), &instructions, &[], blockhash)?;

        let mut tx = VersionedTransaction {
            signatures: vec![Default::default(); 2],
            message: VersionedMessage::V0(message),
        };

        Self::sign_transaction(&mut tx, &[&session_keypair]);

        Ok(tx)
    }

    /// Generate transaction exceeding gas limits
    /// TODO: we should think about making this safe, especially on testnet where we don't want to accidentally cause drainage
    fn generate_invalid_gas(&self, blockhash: Hash) -> Result<VersionedTransaction> {
        let mut instructions = vec![
            // request excessively high compute units
            ComputeBudgetInstruction::set_compute_unit_limit(1_400_000),
            // high priority fee
            ComputeBudgetInstruction::set_compute_unit_price(1_000_000),
        ];

        let (session_instructions, session_keypair) =
            self.build_session_establishment_instructions()?;
        instructions.extend(session_instructions);

        let message =
            v0::Message::try_compile(&self.sponsor_pubkey, &instructions, &[], blockhash)?;

        let mut tx = VersionedTransaction {
            signatures: vec![Default::default(); 2],
            message: VersionedMessage::V0(message),
        };

        Self::sign_transaction(&mut tx, &[&session_keypair]);

        Ok(tx)
    }

    /// Builds the instruction set for establishing a session with no limits
    /// Uses a randomly generated keypair as the new session key for the existing user signer
    fn build_session_establishment_instructions(&self) -> Result<(Vec<Instruction>, Keypair)> {
        let session_keypair = Keypair::new();
        let session_pubkey = session_keypair.pubkey();

        let expires_iso = convert_to_iso_string(
            (SystemTime::now().duration_since(UNIX_EPOCH).unwrap() + Duration::from_secs(3600))
                .as_secs(),
        );

        let message_bytes =
            build_intent_message(&self.chain_id, &self.domain, &expires_iso, &session_pubkey);
        let intent_ix = build_ed25519_verification_ix(&self.user_signer, message_bytes);

        let domain_record_pda = get_domain_record_address(&self.domain);

        let accounts =
            gather_start_session_accounts(self.sponsor_pubkey, session_pubkey, domain_record_pda);
        let start_session_ix = Instruction {
            program_id: SESSION_MANAGER_ID,
            accounts,
            data: vec![0u8],
        };

        Ok((vec![intent_ix, start_session_ix], session_keypair))
    }
}

fn build_intent_message(
    chain_id: &str,
    domain: &str,
    expires_iso: &str,
    session_key: &Pubkey,
) -> Vec<u8> {
    const HEADER: &str = "Fogo Sessions:\nSigning this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.";
    const MAJOR: &str = "0";
    const MINOR: &str = "3";
    const TOKENS: &str = "this app may spend any amount of any token";
    let body = format!(
        "version: {major}.{minor}\nchain_id: {chain}\ndomain: {domain}\nexpires: {expires}\nsession_key: {session_key}\ntokens: {tokens}",
        major = MAJOR,
        minor = MINOR,
        chain = chain_id,
        domain = domain,
        expires = expires_iso,
        session_key = session_key,
        tokens = TOKENS,
    );

    format!("{header}\n\n{body}", header = HEADER, body = body).into_bytes()
}

fn build_ed25519_verification_ix(user_signer: &Keypair, message_bytes: Vec<u8>) -> Instruction {
    let signature = user_signer.sign_message(&message_bytes);
    let mut data = Vec::new();
    data.push(1u8); // num sigs
    data.push(0u8); // padding
    data.extend_from_slice(&48u16.to_le_bytes()); // sig offset
    data.extend_from_slice(&u16::MAX.to_le_bytes()); // sig idx
    data.extend_from_slice(&16u16.to_le_bytes()); // pubkey offset
    data.extend_from_slice(&u16::MAX.to_le_bytes()); // pubkey idx
    data.extend_from_slice(&112u16.to_le_bytes()); // msg offset
    data.extend_from_slice(&(message_bytes.len() as u16).to_le_bytes()); // msg length
    data.extend_from_slice(&u16::MAX.to_le_bytes()); // msg idx
    data.extend_from_slice(&user_signer.pubkey().to_bytes());
    data.extend_from_slice(signature.as_ref());
    data.extend_from_slice(&message_bytes);
    Instruction {
        program_id: ed25519_program::id(),
        accounts: vec![],
        data,
    }
}

fn gather_start_session_accounts(
    sponsor: Pubkey,
    session_pubkey: Pubkey,
    domain_record_pda: Pubkey,
) -> Vec<AccountMeta> {
    let (chain_id_pda, _chain_bump) = Pubkey::find_program_address(&[b"chain_id"], &CHAIN_ID_PID);
    let (session_setter_pda, _setter_bump) =
        Pubkey::find_program_address(&[b"session_setter"], &SESSION_MANAGER_ID);
    let sysvar_instructions_id: Pubkey = solana_program::sysvar::instructions::ID;
    vec![
        AccountMeta::new(sponsor, true),
        AccountMeta::new_readonly(chain_id_pda, false),
        AccountMeta::new(session_pubkey, true),
        AccountMeta::new_readonly(sysvar_instructions_id, false),
        AccountMeta::new_readonly(domain_record_pda, false),
        AccountMeta::new_readonly(session_setter_pda, false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(solana_program::system_program::ID, false),
    ]
}

fn convert_to_iso_string(unix_secs: u64) -> String {
    match OffsetDateTime::from_unix_timestamp(unix_secs as i64) {
        Ok(dt) => dt
            .format(&Rfc3339)
            .unwrap_or_else(|_| format!("{}", unix_secs)),
        Err(_) => format!("{}", unix_secs),
    }
}
