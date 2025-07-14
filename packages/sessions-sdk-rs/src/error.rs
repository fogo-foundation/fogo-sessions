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
