use anchor_lang::prelude::*;

#[error_code]
pub enum DomainRegistryError {
    #[msg("The domain record PDA is invalid")]
    InvalidDomainRecordPda,
    #[msg("The program is already added to the domain record")]
    ProgramAlreadyAdded,
}
