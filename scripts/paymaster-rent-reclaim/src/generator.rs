use anyhow::Result;
use fogo_sessions_sdk::session::SESSION_MANAGER_ID;
use fogo_sessions_sdk::session::Session;
use solana_compute_budget_interface::ComputeBudgetInstruction;
use solana_hash::Hash;
use solana_message::{v0, VersionedMessage};
use solana_program::{
    instruction::{AccountMeta, Instruction},
};
use solana_pubkey::Pubkey;
use solana_transaction::versioned::VersionedTransaction;
use std::sync::atomic::{AtomicUsize, Ordering};

pub struct TransactionGenerator {
    sponsor_pubkeys: Vec<Pubkey>,

    next_sponsor_index: AtomicUsize,
}

impl TransactionGenerator {
    pub fn new(
        sponsor_pubkeys: Vec<Pubkey>,
    ) -> Self {
        Self {
            sponsor_pubkeys,
            next_sponsor_index: AtomicUsize::new(0),
        }
    }

    /// Generate a transaction based on validity type
    pub fn generate(
        &self,
        accounts: &[(Pubkey, Session)],
        blockhash: Hash,
    ) -> Result<VersionedTransaction> {
        let sponsor_pubkey = self.next_sponsor_pubkey();
        let mut instructions = vec![ComputeBudgetInstruction::set_compute_unit_limit(
            7000 * accounts.len() as u32,
        )];
        for (session_pubkey, session_account) in accounts {
            instructions
                .push(self.build_close_session_instruction(session_pubkey, session_account)?);
        }

        let message = v0::Message::try_compile(&sponsor_pubkey, &instructions, &[], blockhash)?;

        let tx = VersionedTransaction {
            signatures: vec![Default::default(); 1],
            message: VersionedMessage::V0(message),
        };

        Ok(tx)
    }

    fn next_sponsor_pubkey(&self) -> Pubkey {
        self.sponsor_pubkeys
            [self.next_sponsor_index.fetch_add(1, Ordering::Relaxed) % self.sponsor_pubkeys.len()]
    }

    /// Builds the instruction set for establishing a session with no limits
    /// Uses a randomly generated keypair as the new session key for the existing user signer
    fn build_close_session_instruction(
        &self,
        session_pubkey: &Pubkey,
        session_account: &Session,
    ) -> Result<Instruction> {
        let accounts = gather_close_session_accounts(session_pubkey, session_account);
        let close_session_ix = Instruction {
            program_id: SESSION_MANAGER_ID,
            accounts,
            data: vec![2u8],
        };

        Ok(close_session_ix)
    }
}

fn gather_close_session_accounts(session_pubkey: &Pubkey, session: &Session) -> Vec<AccountMeta> {
    let (session_setter_pda, _setter_bump) =
        Pubkey::find_program_address(&[b"session_setter"], &SESSION_MANAGER_ID);
    vec![
        AccountMeta::new(*session_pubkey, false),
        AccountMeta::new(session.sponsor, false),
        AccountMeta::new_readonly(session_setter_pda, false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(solana_program::system_program::ID, false),
    ]
}
