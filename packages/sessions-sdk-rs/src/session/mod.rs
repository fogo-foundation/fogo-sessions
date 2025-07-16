use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_program::account_info::AccountInfo;
use solana_program::pubkey::Pubkey;
use solana_program::sysvar::clock::Clock;
use solana_program::sysvar::Sysvar;
use std::collections::HashMap;

use crate::error::SessionError;

#[cfg(feature = "token-program")]
pub mod token_program;

/// The program ID of the session manager program
pub const SESSION_MANAGER_ID: Pubkey =
    solana_program::pubkey!("SesswvJ7puvAgpyqp7N8HnjNnvpnS8447tKNF3sPgbC");

/// The current major version of the `Session` structure
pub const MAJOR: u8 = 0;
/// The current minor version of the `Session` structure
pub const MINOR: u8 = 1;

type UnixTimestamp = i64;

/// Returns true if `info` is a session account
pub fn is_session(info: &AccountInfo) -> bool {
    info.owner == &SESSION_MANAGER_ID
}

/// The on-chain representation of a session. Sessions are represented on-chain as accounts owned by the session manager program, containing a `Session` structure.
#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Session {
    pub discriminator: [u8; 8],
    /// The key that sponsored the session (gas and rent)
    pub sponsor: Pubkey,
    pub session_info: SessionInfo,
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
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
    /// Tokens the session key is allowed to interact with. If `Specific`, the spend limits are stored in each individual token account in the usual `delegated_amount` field.
    pub authorized_tokens: AuthorizedTokens,
    /// Extra (key, value)'s provided by the user, they can be used to store extra arbitrary information about the session
    pub extra: Extra,
}

#[allow(dead_code)]
/// This module is a hack because the BorshSchema macro generates dead code for `AuthorizedPrograms` in this version of borsh, but we don't want to disable dead_code globally.
/// More info: https://github.com/near/borsh-rs/issues/111
mod authorized_programs {
    use super::*;

    #[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
    pub enum AuthorizedPrograms {
        Specific(Vec<AuthorizedProgram>),
        All,
    }
}

pub use authorized_programs::AuthorizedPrograms;

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum AuthorizedTokens {
    Specific,
    All,
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct AuthorizedProgram {
    /// The program ID that the session key is allowed to interact with
    pub program_id: Pubkey,
    /// The PDA of `program_id` with seeds `PROGRAM_SIGNER_SEED`, which is required to sign for in-session token transfers
    pub signer_pda: Pubkey,
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Extra(Vec<ExtraItem>); // Anchor IDL generation doesn't handle vec of tuples well so we have to declare a ExtraItem struct

impl Extra {
    pub fn get(&self, key: &str) -> Option<&str> {
        self.0
            .iter()
            .find(|item| item.0 == key)
            .map(|item| item.1.as_str())
    }
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
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
    pub const DISCRIMINATOR: [u8; 8] = [243, 81, 72, 115, 214, 188, 72, 144];

    /// Extracts the user public key from a signer or session account. If the account is a session, it extracts the user from the session data and also checks that the session is live and the session is allowed to interact with `program_id` on behalf of the user. Otherwise, it just returns the public key of the signer.
    pub fn extract_user_from_signer_or_session(
        info: &AccountInfo,
        program_id: &Pubkey,
    ) -> Result<Pubkey, SessionError> {
        if !info.is_signer {
            return Err(SessionError::MissingRequiredSignature);
        }

        if info.owner == &SESSION_MANAGER_ID {
            let session = Self::try_deserialize(&mut info.data.borrow_mut().as_ref())?;
            session.get_user_checked(program_id)
        } else {
            Ok(*info.key)
        }
    }

    /// Tries to deserialize a session account. This should only be used after checking that the account is owned by the session manager program.
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

    /// This function checks that a session is live and authorized to interact with program `program_id` and returns the public key of the user who started the session
    pub fn get_user_checked(&self, program_id: &Pubkey) -> Result<Pubkey, SessionError> {
        self.check_version()?;
        self.check_is_live()?;
        self.check_authorized_program(program_id)?;
        Ok(self.session_info.user)
    }

    /// Returns the value of one of the session's extra fields with the given key, if it exists
    pub fn get_extra(&self, key: &str) -> Option<&str> {
        self.session_info.extra.get(key)
    }
}
