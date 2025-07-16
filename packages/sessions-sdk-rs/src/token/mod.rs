pub mod instruction;

/// This seed is used to derive a program's signer PDA in the context of session's token transfers.
/// This PDA is required to sign in-session token transfers.
pub const PROGRAM_SIGNER_SEED: &[u8] = b"fogo_session_program_signer";
