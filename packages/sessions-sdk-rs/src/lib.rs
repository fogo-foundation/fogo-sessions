use std::collections::HashMap;

use solana_account_info::AccountInfo;
use solana_pubkey::Pubkey;
use solana_sysvar::{clock::Clock, Sysvar};
use thiserror::Error;

#[cfg(feature = "bytemuck")]
use bytemuck::{Pod, Zeroable};

#[cfg(feature = "borsh")]
use borsh::BorshDeserialize;

#[cfg(feature = "anchor")]
use anchor_lang::prelude::{
    account, borsh, AnchorDeserialize, AnchorError, AnchorSerialize, Discriminator,
};

const ID: Pubkey = solana_pubkey::pubkey!("mCB9AkebGNqN7HhUPxisr7Hd8HzHifCpubj9dCwvctk");
/// The program ID of the session manager program
pub const SESSION_MANAGER_ID: Pubkey = ID;

/// The session setter is a PDA of the session manager program used by the session manager to set token account delegations for Sessions users.
pub const SESSION_SETTER: Pubkey =
    solana_pubkey::pubkey!("FrfXhepGSPsSYXzvEsAxzVW8zDaxdWSneaERaDC1Q911");

/// When in-session token transfers are made, the PDA of an authorized program with this seed needs to sign the transfer
pub const PROGRAM_SIGNER_SEED: &[u8] = b"fogo_session_program_signer";

pub const MAJOR: u8 = 0;
pub const MINOR: u8 = 1;

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
    /// The major version of the session account, major version changes are breaking changes
    pub major: u8,
    /// The minor version of the session account. Until 1.0, every new minor version will be a breaking change.
    pub minor: u8,
    /// The user who started this session
    pub user: Pubkey,
    /// The expiration time of the session
    pub expiration: UnixTimestamp,
    /// Programs the session key is allowed to interact with as a (program_id, signer_pda) pair. We store the signer PDAs so we don't have to recalculate them
    pub authorized_programs: AuthorizedPrograms,
    /// Tokens the session key is allowed to interact with. If `Specific`, the spend limits are stored in each individual token account in the usual delegated_amount field.
    pub authorized_tokens: AuthorizedTokens,
    /// Extra (key, value)'s provided by the user, they can be used to store extra arbitrary information about the session
    pub extra: Extra,
}

#[cfg_attr(feature = "anchor", derive(AnchorDeserialize, AnchorSerialize))]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize))]
#[derive(Debug, Clone)]
pub enum AuthorizedPrograms {
    Specific(Vec<AuthorizedProgram>),
    All,
}

#[cfg_attr(feature = "anchor", derive(AnchorDeserialize, AnchorSerialize))]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize))]
#[derive(Debug, Clone)]
pub enum AuthorizedTokens {
    Specific,
    All,
}

#[cfg_attr(feature = "anchor", derive(AnchorDeserialize, AnchorSerialize))]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize))]
#[cfg_attr(feature = "bytemuck", derive(Pod, Zeroable, Copy))]
#[repr(C)]
#[derive(Debug, Clone, PartialEq)]
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

#[cfg_attr(feature = "anchor", derive(AnchorDeserialize, AnchorSerialize))]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize))]
#[derive(Debug, Clone)]
pub struct ExtraItem(String, String);

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
    pub fn try_deserialize(data: &mut &[u8]) -> Result<Self, SessionError> {
        let result = Session::deserialize(data).map_err(|_| SessionError::InvalidAccountData)?;
        if result.discriminator != Self::DISCRIMINATOR {
            return Err(SessionError::InvalidAccountDiscriminator);
        }
        Ok(result)
    }

    fn check_is_live(&self) -> Result<(), SessionError> {
        if self.session_info.expiration
            < Clock::get()
                .map_err(|_| SessionError::ClockError)?
                .unix_timestamp
        {
            return Err(SessionError::Expired);
        }
        Ok(())
    }

    fn check_user(&self, expected_user: &Pubkey) -> Result<(), SessionError> {
        if self.session_info.user != *expected_user {
            return Err(SessionError::UserMismatch);
        }
        Ok(())
    }

    fn check_authorized_program_signer(&self, signers: &[AccountInfo]) -> Result<(), SessionError> {
        match self.session_info.authorized_programs {
            AuthorizedPrograms::Specific(ref programs) => {
                let signer_account_info = signers
                    .iter()
                    .find(|signer| programs.iter().any(|item| *signer.key == item.signer_pda))
                    .ok_or(SessionError::UnauthorizedProgram)?;
                if !signer_account_info.is_signer {
                    return Err(SessionError::MissingRequiredSignature);
                }
            }
            AuthorizedPrograms::All => {}
        }
        Ok(())
    }

    fn check_authorized_program(&self, program_id: &Pubkey) -> Result<(), SessionError> {
        match self.session_info.authorized_programs {
            AuthorizedPrograms::Specific(ref programs) => {
                programs
                    .iter()
                    .find(|authorized_program| authorized_program.program_id == *program_id)
                    .ok_or(SessionError::UnauthorizedProgram)?;
            }
            AuthorizedPrograms::All => {}
        }
        Ok(())
    }

    /// For 0.x versions, every new minor version will be a breaking change.
    fn check_version(&self) -> Result<(), SessionError> {
        if self.session_info.major != MAJOR || self.session_info.minor != MINOR {
            return Err(SessionError::InvalidAccountVersion);
        }
        Ok(())
    }

    pub fn get_token_permissions_checked(
        &self,
        user: &Pubkey,
        signers: &[AccountInfo],
    ) -> Result<AuthorizedTokens, SessionError> {
        self.check_version()?;
        self.check_is_live()?;
        self.check_user(user)?;
        self.check_authorized_program_signer(signers)?;
        Ok(self.session_info.authorized_tokens.clone())
    }

    /// This function checks that a session is live and authorized to interact with program `program_id` and returns the public key of the user who started the session
    pub fn get_user_checked(&self, program_id: &Pubkey) -> Result<Pubkey, SessionError> {
        self.check_version()?;
        self.check_is_live()?;
        self.check_authorized_program(program_id)?;
        Ok(self.session_info.user)
    }
}

#[derive(Error, Debug, Clone)]
pub enum SessionError {
    #[error("This session has expired")]
    Expired,
    #[error("This session was created for a different user")]
    UserMismatch,
    #[error("This session was created for a different program")]
    UnauthorizedProgram,
    #[error("A required program signer appears as a non-signer")]
    MissingRequiredSignature,
    #[error("There was an error loading the clock sysvar")]
    ClockError,
    #[error("A session account failed to deserialize")]
    InvalidAccountData,
    #[error("A session account has the wrong discriminator")]
    InvalidAccountDiscriminator,
    #[error("A session account has the wrong version")]
    InvalidAccountVersion,
}

#[cfg(feature = "anchor")]
const ERROR_CODE_OFFSET: u32 = anchor_lang::error::ERROR_CODE_OFFSET + 1000;

#[cfg(feature = "anchor")]
impl From<SessionError> for anchor_lang::error::Error {
    fn from(e: SessionError) -> Self {
        anchor_lang::error::Error::AnchorError(Box::new(AnchorError {
            error_name: "SessionError".to_string(),
            error_code_number: e.clone() as u32 + ERROR_CODE_OFFSET,
            error_msg: e.to_string(),
            error_origin: None,
            compared_values: None,
        }))
    }
}
