use std::collections::HashMap;

use solana_account_info::AccountInfo;
use solana_program_error::ProgramError;
use solana_pubkey::Pubkey;
use solana_sysvar::{clock::Clock, Sysvar};
use thiserror::Error;

#[cfg(feature = "borsh")]
use borsh::BorshDeserialize;

#[cfg(feature = "anchor")]
use anchor_lang::prelude::{account, borsh, AnchorDeserialize, AnchorSerialize, Discriminator};

pub const SESSION_SETTER: Pubkey =
    solana_pubkey::pubkey!("FrfXhepGSPsSYXzvEsAxzVW8zDaxdWSneaERaDC1Q911");
const ID: Pubkey = solana_pubkey::pubkey!("mCB9AkebGNqN7HhUPxisr7Hd8HzHifCpubj9dCwvctk");
pub const SESSION_MANAGER_ID: Pubkey = ID;

pub const PROGRAM_SIGNER_SEED: &[u8] = b"fogo_session_program_signer";

#[cfg_attr(feature = "anchor", account)]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize, Clone))]
#[derive(Debug)]
pub struct Session {
    #[cfg(not(feature = "anchor"))]
    pub discriminator: [u8; 8],
    /// The key that sponsored the session (gas and rent)
    pub sponsor: Pubkey,
    pub session_info: SessionInfo,
}

/// Unix time (i.e. seconds since the Unix epoch).
type UnixTimestamp = i64;

#[cfg_attr(feature = "anchor", derive(AnchorDeserialize, AnchorSerialize))]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize))]
#[derive(Debug, Clone)]
pub struct SessionInfo {
    /// The user who started this session
    pub user: Pubkey,
    /// The expiration time of the session
    pub expiration: UnixTimestamp,
    /// Programs the session key is allowed to interact with as a (program_id, signer_pda) pair. We store the signer PDAs so we don't have to recalculate them
    pub authorized_programs: Vec<AuthorizedProgram>,
    /// Extra (key, value)'s provided by the user
    pub extra: Extra,
}

#[cfg_attr(feature = "anchor", derive(AnchorDeserialize, AnchorSerialize))]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize))]
#[derive(Debug, Clone)]
pub struct ExtraItem(String, String);

#[cfg_attr(feature = "anchor", derive(AnchorDeserialize, AnchorSerialize))]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize))]
#[derive(Debug, Clone)]
pub struct AuthorizedProgram {
    /// The program ID that the session key is allowed to interact with
    pub program_id: Pubkey,
    /// The PDA of `program_id` with seeds `PROGRAM_SIGNER_SEED`, which is required to sign for in-session token transfers
    pub signer_pda: Pubkey,
}

#[cfg_attr(feature = "anchor", derive(AnchorDeserialize, AnchorSerialize))]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize))]
#[derive(Debug, Clone)]
pub struct Extra(Vec<ExtraItem>); // Anchor IDL generation doesn't handle vec of tuples well so we have to declare a ExtraItem struct

impl From<HashMap<String, String>> for Extra {
    fn from(map: HashMap<String, String>) -> Self {
        Extra(
            map.into_iter()
                .map(|(key, value)| ExtraItem(key, value))
                .collect(),
        )
    }
}

impl Session {
    #[cfg(feature = "borsh")]
    const DISCRIMINATOR: [u8; 8] = [243, 81, 72, 115, 214, 188, 72, 144];

    #[cfg(feature = "borsh")]
    pub fn try_deserialize(data: &mut &[u8]) -> Result<Self, ProgramError> {
        let result = Session::deserialize(data).map_err(|_| ProgramError::InvalidAccountData)?;
        if result.discriminator != Self::DISCRIMINATOR {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(result)
    }

    pub fn check_is_live(&self) -> Result<(), ProgramError> {
        if self.session_info.expiration < Clock::get()?.unix_timestamp {
            return Err(SessionError::Expired.into());
        }
        Ok(())
    }

    pub fn check_user(&self, expected_user: &Pubkey) -> Result<(), ProgramError> {
        if self.session_info.user != *expected_user {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(())
    }

    pub fn check_authorized_program_signer(
        &self,
        signers: &[AccountInfo],
    ) -> Result<(), ProgramError> {
        let signer_account_info = signers
            .iter()
            .find(|signer| {
                self.session_info
                    .authorized_programs
                    .iter()
                    .any(|item| *signer.key == item.signer_pda)
            })
            .ok_or(SessionError::UnauthorizedProgram)?;
        if !signer_account_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        Ok(())
    }

    pub fn check_authorized_program(&self, program_id: &Pubkey) -> Result<(), ProgramError> {
        self.session_info
            .authorized_programs
            .iter()
            .find(|authorized_program| authorized_program.program_id == *program_id)
            .ok_or(SessionError::UnauthorizedProgram)?;
        Ok(())
    }
}

#[derive(Clone, Debug, Eq, Error, PartialEq)]
pub enum SessionError {
    #[error("Session is expired")]
    Expired,
    #[error("Session was created for a different user")]
    UserMismatch,
    #[error("Session was created for a different program")]
    UnauthorizedProgram,
}

impl From<SessionError> for ProgramError {
    fn from(e: SessionError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
