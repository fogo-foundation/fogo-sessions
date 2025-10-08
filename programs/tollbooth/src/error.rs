use anchor_lang::prelude::*;

#[error_code]
pub enum TollboothError {
    #[msg("The destination fee collector account doesn't match the fee collector account in the session")]
    InvalidDestination,
}
