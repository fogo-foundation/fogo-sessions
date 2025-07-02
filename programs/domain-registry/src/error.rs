use anchor_lang::prelude::*;

#[error_code]
pub enum DomainRegistryError {
    #[msg("The domain record address is invalid")]
    InvalidDomainRecordAddress,
    #[msg("The program is already added to the domain record")]
    ProgramAlreadyAdded,
}
