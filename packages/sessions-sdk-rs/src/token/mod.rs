pub mod instruction;

/// This seed is used to derive a program's signer PDA in the context of sessions.
/// This PDA is required to sign in-session token transfers. This allows the token program to verify that the transfer is happening within an authorized program.
pub const PROGRAM_SIGNER_SEED: &[u8] = b"fogo_session_program_signer";
