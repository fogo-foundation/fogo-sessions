use anchor_lang::prelude::*;

#[error_code]
pub enum TollboothError {
    #[msg("The source token account is not the associated token account of the user of the session")]
    InvalidSource,
    #[msg("The destination token account is not the associated token account of the toll recipient for the domain")]
    InvalidDestination,
}
