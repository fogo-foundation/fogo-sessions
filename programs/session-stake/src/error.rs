use anchor_lang::prelude::*;

#[error_code]
pub enum SessionStakeError {
  #[msg("Invalid authority")]
  InvalidAuthority,
  #[msg("Invalid destination token account")]
  InvalidDestinationTokenAccount,
  #[msg("Missing authorize extra session key")]
  MissingAuthorizeExtraSessionKey,
  #[msg("Invalid address in extra session keys")]
  InvalidAddress,
  #[msg("Invalid instruction argument")]
  InvalidArgument,
}
