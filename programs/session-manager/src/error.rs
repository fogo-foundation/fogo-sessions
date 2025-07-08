use anchor_lang::prelude::*;

#[error_code]
pub enum SessionManagerError {
    #[msg("The signed intent is not a valid UTF-8 string")]
    InvalidMessageString,
    #[msg("The signed intent header text is not what was expected")]
    IntentHeaderMismatch,
    #[msg("Error while parsing the version field")]
    ParsingErrorVersion,
    #[msg("We couldn't parse the expiration date from the signed intent")]
    ParsingErrorDate,
    #[msg("We couldn't parse the session key from the signed intent")]
    ParsingErrorSessionKey,
    #[msg("We couldn't parse a required key from the signed intent")]
    ParsingErrorRequiredKey,
    #[msg("We couldn't parse the token section from the signed intent")]
    ParsingErrorTokenSection,
    #[msg("We couldn't parse the extra section from the signed intent")]
    ParsingErrorExtraSection,
    #[msg("The signed intent contains a duplicate token")]
    DuplicateToken,
    #[msg("A reserved key was found in the extra section of the signed intent")]
    ReservedKey,
    #[msg("A required key was not found in the signed intent")]
    RequiredKeyNotFound,
    #[msg("This signed intent version is not supported")]
    InvalidVersion,
    #[msg("The session key provided doesn't match the session key in the signed intent")]
    SessionKeyMismatch,
    #[msg("This blockchain's id doesn't match the chain id in the signed intent")]
    ChainIdMismatch,
    #[msg("The domain record provided is not the domain record of the domain in the signed intent")]
    DomainRecordMismatch,
    #[msg("An account is missing")]
    MissingAccount,
    #[msg("The metadata account provided is not the metadata account of the provided mint")]
    MetadataMismatch,
    #[msg("The symbol in the metadata account doesn't match the symbol in the signed intent")]
    SymbolMismatch,
    #[msg("The mint provided doesn't match the mint in the signed intent")]
    MintMismatch,
    #[msg("The associated token account provided is not the associated token account of the provided user and mint")]
    AssociatedTokenAccountMismatch,
    #[msg("The provided token amount could not be converted to a u64")]
    AmountConversionFailed,
    #[msg("Signature verification must be performed by the ed25519 program")]
    SignatureVerificationErrorProgram,
    #[msg("The header of the ed25519 instruction is not what was expected")]
    SignatureVerificationUnexpectedHeader,
    
}
