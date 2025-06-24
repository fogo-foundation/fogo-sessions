#![feature(prelude_import)]
#[prelude_import]
use std::prelude::rust_2021::*;
#[macro_use]
extern crate std;
use std::collections::HashMap;
use solana_account_info::AccountInfo;
use solana_program_error::ProgramError;
use solana_pubkey::Pubkey;
use solana_sysvar::{clock::Clock, Sysvar};
use thiserror::Error;
pub const SESSION_SETTER: Pubkey = ::solana_pubkey::Pubkey::from_str_const(
    "FrfXhepGSPsSYXzvEsAxzVW8zDaxdWSneaERaDC1Q911",
);
const ID: Pubkey = ::solana_pubkey::Pubkey::from_str_const(
    "mCB9AkebGNqN7HhUPxisr7Hd8HzHifCpubj9dCwvctk",
);
pub const SESSION_MANAGER_ID: Pubkey = ID;
pub const PROGRAM_SIGNER_SEED: &[u8] = b"fogo_session_program_signer";
pub struct Session {
    pub discriminator: [u8; 8],
    /// The key that sponsored the session (gas and rent)
    pub sponsor: Pubkey,
    pub session_info: SessionInfo,
}
#[automatically_derived]
impl ::core::fmt::Debug for Session {
    #[inline]
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::debug_struct_field3_finish(
            f,
            "Session",
            "discriminator",
            &self.discriminator,
            "sponsor",
            &self.sponsor,
            "session_info",
            &&self.session_info,
        )
    }
}
/// Unix time (i.e. seconds since the Unix epoch).
type UnixTimestamp = i64;
pub struct SessionInfo {
    /// The user who started this session
    pub user: Pubkey,
    /// The expiration time of the session
    pub expiration: UnixTimestamp,
    /// Programs the session key is allowed to interact with as a (program_id, signer_pda) pair. We store the signer PDAs so we don't have to recalculate them
    pub authorized_programs: AuthorizedPrograms,
    /// Tokens the session key is allowed to interact with. If `Specific`, the spend limits are stored in each individual token account in the usual delegated_amount field.
    pub authorized_tokens: AuthorizedTokens,
    /// Extra (key, value)'s provided by the user
    pub extra: Extra,
}
#[automatically_derived]
impl ::core::fmt::Debug for SessionInfo {
    #[inline]
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::debug_struct_field5_finish(
            f,
            "SessionInfo",
            "user",
            &self.user,
            "expiration",
            &self.expiration,
            "authorized_programs",
            &self.authorized_programs,
            "authorized_tokens",
            &self.authorized_tokens,
            "extra",
            &&self.extra,
        )
    }
}
#[automatically_derived]
impl ::core::clone::Clone for SessionInfo {
    #[inline]
    fn clone(&self) -> SessionInfo {
        SessionInfo {
            user: ::core::clone::Clone::clone(&self.user),
            expiration: ::core::clone::Clone::clone(&self.expiration),
            authorized_programs: ::core::clone::Clone::clone(&self.authorized_programs),
            authorized_tokens: ::core::clone::Clone::clone(&self.authorized_tokens),
            extra: ::core::clone::Clone::clone(&self.extra),
        }
    }
}
pub enum AuthorizedPrograms {
    Specific(Vec<AuthorizedProgram>),
    All,
}
#[automatically_derived]
impl ::core::fmt::Debug for AuthorizedPrograms {
    #[inline]
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        match self {
            AuthorizedPrograms::Specific(__self_0) => {
                ::core::fmt::Formatter::debug_tuple_field1_finish(
                    f,
                    "Specific",
                    &__self_0,
                )
            }
            AuthorizedPrograms::All => ::core::fmt::Formatter::write_str(f, "All"),
        }
    }
}
#[automatically_derived]
impl ::core::clone::Clone for AuthorizedPrograms {
    #[inline]
    fn clone(&self) -> AuthorizedPrograms {
        match self {
            AuthorizedPrograms::Specific(__self_0) => {
                AuthorizedPrograms::Specific(::core::clone::Clone::clone(__self_0))
            }
            AuthorizedPrograms::All => AuthorizedPrograms::All,
        }
    }
}
pub enum AuthorizedTokens {
    Specific,
    All,
}
#[automatically_derived]
impl ::core::fmt::Debug for AuthorizedTokens {
    #[inline]
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::write_str(
            f,
            match self {
                AuthorizedTokens::Specific => "Specific",
                AuthorizedTokens::All => "All",
            },
        )
    }
}
#[automatically_derived]
impl ::core::clone::Clone for AuthorizedTokens {
    #[inline]
    fn clone(&self) -> AuthorizedTokens {
        match self {
            AuthorizedTokens::Specific => AuthorizedTokens::Specific,
            AuthorizedTokens::All => AuthorizedTokens::All,
        }
    }
}
pub struct AuthorizedProgram {
    /// The program ID that the session key is allowed to interact with
    pub program_id: Pubkey,
    /// The PDA of `program_id` with seeds `PROGRAM_SIGNER_SEED`, which is required to sign for in-session token transfers
    pub signer_pda: Pubkey,
}
#[automatically_derived]
impl ::core::fmt::Debug for AuthorizedProgram {
    #[inline]
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::debug_struct_field2_finish(
            f,
            "AuthorizedProgram",
            "program_id",
            &self.program_id,
            "signer_pda",
            &&self.signer_pda,
        )
    }
}
#[automatically_derived]
impl ::core::clone::Clone for AuthorizedProgram {
    #[inline]
    fn clone(&self) -> AuthorizedProgram {
        AuthorizedProgram {
            program_id: ::core::clone::Clone::clone(&self.program_id),
            signer_pda: ::core::clone::Clone::clone(&self.signer_pda),
        }
    }
}
pub struct Extra(Vec<ExtraItem>);
#[automatically_derived]
impl ::core::fmt::Debug for Extra {
    #[inline]
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::debug_tuple_field1_finish(f, "Extra", &&self.0)
    }
}
#[automatically_derived]
impl ::core::clone::Clone for Extra {
    #[inline]
    fn clone(&self) -> Extra {
        Extra(::core::clone::Clone::clone(&self.0))
    }
}
pub struct ExtraItem(String, String);
#[automatically_derived]
impl ::core::fmt::Debug for ExtraItem {
    #[inline]
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::debug_tuple_field2_finish(
            f,
            "ExtraItem",
            &self.0,
            &&self.1,
        )
    }
}
#[automatically_derived]
impl ::core::clone::Clone for ExtraItem {
    #[inline]
    fn clone(&self) -> ExtraItem {
        ExtraItem(
            ::core::clone::Clone::clone(&self.0),
            ::core::clone::Clone::clone(&self.1),
        )
    }
}
impl From<HashMap<String, String>> for Extra {
    fn from(map: HashMap<String, String>) -> Self {
        Extra(map.into_iter().map(|(key, value)| ExtraItem(key, value)).collect())
    }
}
impl Session {
    fn check_is_live(&self) -> Result<(), ProgramError> {
        if self.session_info.expiration < Clock::get()?.unix_timestamp {
            return Err(SessionError::Expired.into());
        }
        Ok(())
    }
    fn check_user(&self, expected_user: &Pubkey) -> Result<(), ProgramError> {
        if self.session_info.user != *expected_user {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(())
    }
    fn check_authorized_program_signer(
        &self,
        signers: &[AccountInfo],
    ) -> Result<(), ProgramError> {
        match self.session_info.authorized_programs {
            AuthorizedPrograms::Specific(ref programs) => {
                let signer_account_info = signers
                    .iter()
                    .find(|signer| {
                        programs.iter().any(|item| *signer.key == item.signer_pda)
                    })
                    .ok_or(SessionError::UnauthorizedProgram)?;
                if !signer_account_info.is_signer {
                    return Err(ProgramError::MissingRequiredSignature);
                }
            }
            AuthorizedPrograms::All => {}
        }
        Ok(())
    }
    fn check_authorized_program(&self, program_id: &Pubkey) -> Result<(), ProgramError> {
        match self.session_info.authorized_programs {
            AuthorizedPrograms::Specific(ref programs) => {
                programs
                    .iter()
                    .find(|authorized_program| {
                        authorized_program.program_id == *program_id
                    })
                    .ok_or(SessionError::UnauthorizedProgram)?;
            }
            AuthorizedPrograms::All => {}
        }
        Ok(())
    }
    pub fn get_token_permissions_checked(
        &self,
        user: &Pubkey,
        signers: &[AccountInfo],
    ) -> Result<AuthorizedTokens, ProgramError> {
        self.check_is_live()?;
        self.check_user(user)?;
        self.check_authorized_program_signer(signers)?;
        Ok(self.session_info.authorized_tokens.clone())
    }
    pub fn get_user_checked(&self, program_id: &Pubkey) -> Result<Pubkey, ProgramError> {
        self.check_is_live()?;
        self.check_authorized_program(program_id)?;
        Ok(self.session_info.user)
    }
}
pub enum SessionError {
    #[error("Session is expired")]
    Expired,
    #[error("Session was created for a different user")]
    UserMismatch,
    #[error("Session was created for a different program")]
    UnauthorizedProgram,
}
#[allow(unused_qualifications)]
#[automatically_derived]
impl ::thiserror::__private::Error for SessionError {}
#[allow(unused_qualifications)]
#[automatically_derived]
impl ::core::fmt::Display for SessionError {
    fn fmt(&self, __formatter: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        #[allow(unused_variables, deprecated, clippy::used_underscore_binding)]
        match self {
            SessionError::Expired {} => __formatter.write_str("Session is expired"),
            SessionError::UserMismatch {} => {
                __formatter.write_str("Session was created for a different user")
            }
            SessionError::UnauthorizedProgram {} => {
                __formatter.write_str("Session was created for a different program")
            }
        }
    }
}
#[automatically_derived]
impl ::core::fmt::Debug for SessionError {
    #[inline]
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::write_str(
            f,
            match self {
                SessionError::Expired => "Expired",
                SessionError::UserMismatch => "UserMismatch",
                SessionError::UnauthorizedProgram => "UnauthorizedProgram",
            },
        )
    }
}
impl From<SessionError> for ProgramError {
    fn from(e: SessionError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
