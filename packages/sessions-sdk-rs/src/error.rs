use solana_program::program_error::ProgramError;
use thiserror::Error;

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

impl From<SessionError> for u32 {
    fn from(err: SessionError) -> u32 {
        match err {
            SessionError::Expired => 4_000_000_000,
            SessionError::UserMismatch => 4_000_000_001,
            SessionError::UnauthorizedProgram => 4_000_000_002,
            SessionError::MissingRequiredSignature => 4_000_000_003,
            SessionError::ClockError => 4_000_000_004,
            SessionError::InvalidAccountData => 4_000_000_005,
            SessionError::InvalidAccountDiscriminator => 4_000_000_006,
            SessionError::InvalidAccountVersion => 4_000_000_007,
        }
    }
}

impl From<SessionError> for ProgramError {
    fn from(err: SessionError) -> Self {
        Self::Custom(err.into())
    }
}

#[cfg(feature = "anchor")]
impl From<SessionError> for anchor_lang::error::Error {
    fn from(err: SessionError) -> Self {
        Into::<ProgramError>::into(err).into()
    }
}
