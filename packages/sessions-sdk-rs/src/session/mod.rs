use borsh::BorshSchema;
use solana_program::hash::HASH_BYTES;
use solana_program::pubkey::Pubkey;
use solana_program::sysvar::clock::Clock;
use solana_program::sysvar::Sysvar;
use solana_program::{account_info::AccountInfo, hash::Hash};
use std::collections::HashMap;
use std::fmt::Debug;

#[cfg(not(feature = "anchor"))]
use borsh::{BorshDeserialize, BorshSerialize};

#[cfg(feature = "anchor")]
use anchor_lang::{
    account,
    prelude::{AnchorDeserialize as BorshDeserialize, AnchorSerialize as BorshSerialize},
    AccountDeserialize, AnchorDeserialize, AnchorSerialize, Discriminator,
};

use crate::error::SessionError;

#[cfg(feature = "token-program")]
pub mod token_program;

/// The program ID of the session manager program
pub const SESSION_MANAGER_ID: Pubkey =
    solana_program::pubkey!("SesswvJ7puvAgpyqp7N8HnjNnvpnS8447tKNF3sPgbC");

/// The current major version of the `Session` structure
pub const MAJOR: u8 = 0;
/// The current minor version of the `Session` structure
pub const MINOR: u8 = 2;

type UnixTimestamp = i64;

/// Returns whether `info` is a session account
pub fn is_session(info: &AccountInfo) -> bool {
    info.owner == &SESSION_MANAGER_ID
}

/// The on-chain representation of a session. Sessions are represented on-chain as accounts owned by the session manager program, containing a `Session` structure.
#[cfg_attr(feature = "anchor", account)]
#[cfg_attr(
    not(feature = "anchor"),
    derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)
)]
pub struct Session {
    #[cfg(not(feature = "anchor"))]
    pub discriminator: [u8; 8],
    /// The key that sponsored the session (gas and rent)
    pub sponsor: Pubkey,
    /// The major version of the session account, major version changes are breaking changes
    pub major: u8,
    /// The session information. The enum variant of `SessionInfo` represents the minor version of the session account. Until 1.0, minor versions may be breaking changes.
    pub session_info: SessionInfo,
}

/// This module is a hack because the BorshSchema macro generates dead code for `SessionInfo` in this version of borsh, but we don't want to disable dead_code globally.
/// More info: https://github.com/near/borsh-rs/issues/111"
#[allow(dead_code)]
mod session_info {
    use super::*;

    #[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
    pub enum SessionInfo {
        Invalid, // This is a hack for borsh to assign a discriminator of 1 to V1
        V1(ActiveSessionInfo<AuthorizedTokens>),
        V2(V2),
        V3(V3),
        V4(V4),
    }
}
pub use session_info::SessionInfo;

/// This module is a hack because the BorshSchema macro generates dead code for `V2` in this version of borsh, but we don't want to disable dead_code globally.
/// More info: https://github.com/near/borsh-rs/issues/111"
#[allow(dead_code)]
mod v2 {
    use super::*;
    #[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
    pub enum V2 {
        Revoked(UnixTimestamp),
        Active(ActiveSessionInfo<AuthorizedTokens>),
    }
}

pub use v2::V2;

/// This module is a hack because the BorshSchema macro generates dead code for `V3` in this version of borsh, but we don't want to disable dead_code globally.
/// More info: https://github.com/near/borsh-rs/issues/111"
#[allow(dead_code)]
mod v3 {
    use super::*;
    #[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
    pub enum V3 {
        Revoked(RevokedSessionInfo),
        Active(ActiveSessionInfo<AuthorizedTokensWithMints>),
    }
}

pub use v3::V3;

#[allow(dead_code)]
mod v4 {
    use super::*;
    #[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
    pub enum V4 {
        Revoked(RevokedSessionInfo),
        Active(ActiveSessionInfoWithDomainId),
    }
}

pub use v4::V4;

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct RevokedSessionInfo {
    /// The user who started this session
    pub user: Pubkey,
    /// The expiration time of the session
    pub expiration: UnixTimestamp,
    /// Tokens the session key is allowed to interact with. We need to store this in revoked sessions so that we know which token account delegations to revoke when the session is closed
    pub authorized_tokens_with_mints: AuthorizedTokensWithMints,
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct ActiveSessionInfo<T: IsAuthorizedTokens> {
    /// The user who started this session
    pub user: Pubkey,
    /// The expiration time of the session
    pub expiration: UnixTimestamp,
    /// Programs the session key is allowed to interact with as a (program_id, signer_pda) pair. We store the signer PDAs so we don't have to recalculate them
    pub authorized_programs: AuthorizedPrograms,
    /// Tokens the session key is allowed to interact with. If `Specific`, the spend limits are stored in each individual token account in the usual `delegated_amount` field.
    pub authorized_tokens: T,
    /// Extra (key, value)'s provided by the user, they can be used to store extra arbitrary information about the session
    pub extra: Extra,
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct ActiveSessionInfoWithDomainId {
    /// The sha256 hash of the domain name for this session
    pub domain_id: DomainId,
    pub active_session_info: ActiveSessionInfo<AuthorizedTokensWithMints>,
}

impl AsRef<ActiveSessionInfo<AuthorizedTokensWithMints>> for ActiveSessionInfoWithDomainId {
    fn as_ref(&self) -> &ActiveSessionInfo<AuthorizedTokensWithMints> {
        &self.active_session_info
    }
}

pub trait IsDomainId: Debug + Clone + BorshDeserialize + BorshSerialize + BorshSchema {}

impl IsDomainId for () {}

pub type DomainId = [u8; HASH_BYTES];

impl IsDomainId for DomainId {}

pub trait IsAuthorizedTokens:
    Debug + Clone + BorshDeserialize + BorshSerialize + BorshSchema
{
}

///This module is a hack because the BorshSchema macro generates dead code for `AuthorizedPrograms` in this version of borsh, but we don't want to disable dead_code globally.
/// More info: https://github.com/near/borsh-rs/issues/111"
#[allow(dead_code)]
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

impl IsAuthorizedTokens for AuthorizedTokens {}

///This module is a hack because the BorshSchema macro generates dead code for `AuthorizedTokensWithMints` in this version of borsh, but we don't want to disable dead_code globally.
/// More info: https://github.com/near/borsh-rs/issues/111"
#[allow(dead_code)]
mod authorized_tokens_with_mints {
    use super::*;

    #[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
    pub enum AuthorizedTokensWithMints {
        Specific(Vec<Pubkey>),
        All,
    }
}

pub use authorized_tokens_with_mints::AuthorizedTokensWithMints;

impl IsAuthorizedTokens for AuthorizedTokensWithMints {}

impl AsRef<AuthorizedTokens> for AuthorizedTokensWithMints {
    fn as_ref(&self) -> &AuthorizedTokens {
        match self {
            AuthorizedTokensWithMints::Specific(_) => &AuthorizedTokens::Specific,
            AuthorizedTokensWithMints::All => &AuthorizedTokens::All,
        }
    }
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
    /// Extracts the user public key from a signer or a session account. If the account is a session, it extracts the user from the session data and also checks that the session is live and the session is allowed to interact with `program_id` on behalf of the user. Otherwise, it just returns the public key of the signer.
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

    #[cfg(feature = "anchor")]
    /// Tries to deserialize a session account. This should only be used after checking that the account is owned by the session manager program.
    pub fn try_deserialize(data: &mut &[u8]) -> Result<Self, SessionError> {
        AccountDeserialize::try_deserialize(data).map_err(|_| SessionError::InvalidAccountData)
    }

    #[cfg(not(feature = "anchor"))]
    const DISCRIMINATOR: [u8; 8] = [243, 81, 72, 115, 214, 188, 72, 144];
    #[cfg(not(feature = "anchor"))]
    /// Tries to deserialize a session account. This should only be used after checking that the account is owned by the session manager program.
    pub fn try_deserialize(data: &mut &[u8]) -> Result<Self, SessionError> {
        let result = Session::deserialize(data).map_err(|_| SessionError::InvalidAccountData)?;
        if result.discriminator != Self::DISCRIMINATOR {
            return Err(SessionError::InvalidAccountDiscriminator);
        }
        Ok(result)
    }

    fn domain_id(&self) -> Result<&DomainId, SessionError> {
        match &self.session_info {
            SessionInfo::Invalid | SessionInfo::V1(_) | SessionInfo::V2(_) | SessionInfo::V3(_) => {
                Err(SessionError::InvalidAccountVersion)
            }
            SessionInfo::V4(session) => match session {
                V4::Revoked(_) => Err(SessionError::Revoked),
                V4::Active(session) => Ok(&session.domain_id),
            },
        }
    }

    fn expiration(&self) -> Result<UnixTimestamp, SessionError> {
        match &self.session_info {
            SessionInfo::V1(session) => Ok(session.expiration),
            SessionInfo::V2(session) => match session {
                V2::Revoked(expiration) => Ok(*expiration),
                V2::Active(session) => Ok(session.expiration),
            },
            SessionInfo::V3(session) => match session {
                V3::Revoked(session) => Ok(session.expiration),
                V3::Active(session) => Ok(session.expiration),
            },
            SessionInfo::V4(session) => match session {
                V4::Revoked(session) => Ok(session.expiration),
                V4::Active(session) => Ok(session.as_ref().expiration),
            },
            SessionInfo::Invalid => Err(SessionError::InvalidAccountVersion),
        }
    }

    fn authorized_programs(&self) -> Result<&AuthorizedPrograms, SessionError> {
        match &self.session_info {
            SessionInfo::V1(session) => Ok(&session.authorized_programs),
            SessionInfo::V2(session) => match session {
                V2::Revoked(_) => Err(SessionError::Revoked),
                V2::Active(session) => Ok(&session.authorized_programs),
            },
            SessionInfo::V3(session) => match session {
                V3::Revoked(_) => Err(SessionError::Revoked),
                V3::Active(session) => Ok(&session.authorized_programs),
            },
            SessionInfo::V4(session) => match session {
                V4::Revoked(_) => Err(SessionError::Revoked),
                V4::Active(session) => Ok(&session.as_ref().authorized_programs),
            },
            SessionInfo::Invalid => Err(SessionError::InvalidAccountVersion),
        }
    }

    fn user(&self) -> Result<&Pubkey, SessionError> {
        match &self.session_info {
            SessionInfo::V1(session) => Ok(&session.user),
            SessionInfo::V2(session) => match session {
                V2::Revoked(_) => Err(SessionError::Revoked),
                V2::Active(session) => Ok(&session.user),
            },
            SessionInfo::V3(session) => match session {
                V3::Revoked(session) => Ok(&session.user),
                V3::Active(session) => Ok(&session.user),
            },
            SessionInfo::V4(session) => match session {
                V4::Revoked(session) => Ok(&session.user),
                V4::Active(session) => Ok(&session.as_ref().user),
            },
            SessionInfo::Invalid => Err(SessionError::InvalidAccountVersion),
        }
    }
    fn extra(&self) -> Result<&Extra, SessionError> {
        match &self.session_info {
            SessionInfo::V1(session) => Ok(&session.extra),
            SessionInfo::V2(session) => match session {
                V2::Revoked(_) => Err(SessionError::Revoked),
                V2::Active(session) => Ok(&session.extra),
            },
            SessionInfo::V3(session) => match session {
                V3::Revoked(_) => Err(SessionError::Revoked),
                V3::Active(session) => Ok(&session.extra),
            },
            SessionInfo::V4(session) => match session {
                V4::Revoked(_) => Err(SessionError::Revoked),
                V4::Active(session) => Ok(&session.as_ref().extra),
            },
            SessionInfo::Invalid => Err(SessionError::InvalidAccountVersion),
        }
    }

    fn check_is_live(&self) -> Result<(), SessionError> {
        if self.is_live()? {
            Ok(())
        } else {
            Err(SessionError::Expired)
        }
    }

    fn check_authorized_program(&self, program_id: &Pubkey) -> Result<(), SessionError> {
        match self.authorized_programs()? {
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
        if self.major != MAJOR {
            return Err(SessionError::InvalidAccountVersion);
        }
        if matches!(self.session_info, SessionInfo::Invalid) {
            return Err(SessionError::InvalidAccountVersion);
        }
        Ok(())
    }

    fn check_is_unrevoked(&self) -> Result<(), SessionError> {
        match &self.session_info {
            SessionInfo::V1(_)
            | SessionInfo::V2(V2::Active(_))
            | SessionInfo::V3(V3::Active(_))
            | SessionInfo::V4(V4::Active(_)) => Ok(()),
            SessionInfo::V2(V2::Revoked(_))
            | SessionInfo::V3(V3::Revoked(_))
            | SessionInfo::V4(V4::Revoked(_)) => Err(SessionError::Revoked),
            SessionInfo::Invalid => Err(SessionError::InvalidAccountVersion),
        }
    }

    /// Returns whether the session is live. Revoked sessions are considered live until their expiration time.
    pub fn is_live(&self) -> Result<bool, SessionError> {
        Ok(Clock::get()
            .map_err(|_| SessionError::ClockError)?
            .unix_timestamp
            <= self.expiration()?)
    }

    pub fn get_domain_id_checked(&self) -> Result<&DomainId, SessionError> {
        self.check_version()?;
        self.check_is_unrevoked()?;
        self.check_is_live()?;
        Ok(self.domain_id()?)
    }

    /// This function checks that a session is live and authorized to interact with program `program_id` and returns the public key of the user who started the session
    pub fn get_user_checked(&self, program_id: &Pubkey) -> Result<Pubkey, SessionError> {
        self.check_version()?;
        self.check_is_unrevoked()?;
        self.check_is_live()?;
        self.check_authorized_program(program_id)?;
        Ok(*self.user()?)
    }

    /// Returns the value of one of the session's extra fields with the given key, if it exists
    pub fn get_extra(&self, key: &str) -> Result<Option<&str>, SessionError> {
        Ok(self.extra()?.get(key))
    }
}
