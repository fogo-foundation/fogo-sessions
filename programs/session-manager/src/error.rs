use crate::Message;
use anchor_lang::prelude::*;
use solana_intents::IntentError;

#[error_code]
pub enum SessionManagerError {
    #[msg("This transaction is missing the required intent message instruction")]
    NoIntentMessageInstruction,
    #[msg(
        "The instruction preceding the intent transfer instruction is not an ed25519 instruction"
    )]
    IncorrectInstructionProgramId,
    #[msg("The ed25519 instruction's header is incorrect")]
    SignatureVerificationUnexpectedHeader,
    #[msg("This signed intent version is not supported")]
    InvalidVersion,
    #[msg("The intent message was malformed and could not be parsed")]
    ParseFailedError,
    #[msg("The borsh payload of the ed25519 instruction could not be deserialized")]
    DeserializeFailedError,
    #[msg("This blockchain's id doesn't match the chain id in the signed intent")]
    ChainIdMismatch,
    #[msg("The session key provided doesn't match the session key in the signed intent")]
    SessionKeyMismatch,
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
    #[msg(
        "The domain record provided is not the domain record of the domain in the signed intent"
    )]
    DomainRecordMismatch,
    #[msg("The provided sponsor account doesn't match the session sponsor")]
    SponsorMismatch,
    #[msg("Only expired session accounts can be closed")]
    SessionIsLive,
    #[msg("The ledger offchain message's header is incorrect")]
    LedgerOffchainMessageUnexpectedHeader,
}

impl From<IntentError<<Message as TryFrom<Vec<u8>>>::Error>> for SessionManagerError {
    fn from(err: IntentError<<Message as TryFrom<Vec<u8>>>::Error>) -> Self {
        match err {
            IntentError::NoIntentMessageInstruction(_) => {
                SessionManagerError::NoIntentMessageInstruction
            }
            IntentError::IncorrectInstructionProgramId => {
                SessionManagerError::IncorrectInstructionProgramId
            }
            IntentError::SignatureVerificationUnexpectedHeader => {
                SessionManagerError::SignatureVerificationUnexpectedHeader
            }
            IntentError::ParseFailedError(_) => SessionManagerError::ParseFailedError,
            IntentError::DeserializeFailedError(_) => SessionManagerError::DeserializeFailedError,
            IntentError::LedgerOffchainMessageUnexpectedHeader => {
                SessionManagerError::LedgerOffchainMessageUnexpectedHeader
            }
        }
    }
}
