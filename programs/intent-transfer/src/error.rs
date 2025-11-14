use anchor_lang::prelude::*;
use nom::error::Error;
use nom::Err;
use solana_intents::IntentError;

#[error_code]
pub enum IntentTransferError {
    #[msg("This transaction is missing the required intent message instruction")]
    NoIntentMessageInstruction,
    #[msg(
        "The instruction preceding the intent transfer instruction is not an ed25519 instruction"
    )]
    IncorrectInstructionProgramId,
    #[msg("The ed25519 instruction's header is incorrect")]
    SignatureVerificationUnexpectedHeader,
    #[msg("The intent message was malformed and could not be parsed")]
    ParseFailedError,
    #[msg("The borsh payload of the ed25519 instruction could not be deserialized")]
    DeserializeFailedError,
    #[msg("This blockchain's id doesn't match the chain id in the signed intent")]
    ChainIdMismatch,
    #[msg("The signer of the intent doesn't own the source ATA")]
    SignerSourceMismatch,
    #[msg("The recipient account doesn't match the destination in the signed intent")]
    RecipientMismatch,
    #[msg("The mint account doesn't match the mint in the signed intent")]
    MintMismatch,
    #[msg(
        "The intent is using a symbol to reference the mint, but no metadata account was provided"
    )]
    MetadataAccountRequired,
    #[msg("A metadata account was provided but the intent is using a mint address")]
    MetadataAccountNotAllowed,
    #[msg("The metadata account provided is not the metadata account of the provided mint")]
    MetadataMismatch,
    #[msg("The symbol in the metadata account doesn't match the symbol in the signed intent")]
    SymbolMismatch,
    #[msg("The message's nonce is not one more than the previous nonce")]
    NonceFailure,
    #[msg("The recipient address could not be parsed as a valid address")]
    InvalidRecipientAddress,
    #[msg("The provided to chain ID is unsupported")]
    UnsupportedToChainId,
    #[msg("The provided Ntt manager for the given mint is invalid")]
    InvalidNttManager,
    #[msg("Unauthorized: only upgrade authority can call this")]
    Unauthorized,
    #[msg("The signed quote for NTT execution is invalid")]
    InvalidNttSignedQuote,
    #[msg("The fee amount signed by the user is not enough for this action")]
    InsufficientFeeAmount,
}

type NomError = Err<Error<Vec<u8>>>;
impl From<IntentError<NomError>> for IntentTransferError {
    fn from(err: IntentError<NomError>) -> Self {
        match err {
            IntentError::NoIntentMessageInstruction(_) => {
                IntentTransferError::NoIntentMessageInstruction
            }
            IntentError::IncorrectInstructionProgramId => {
                IntentTransferError::IncorrectInstructionProgramId
            }
            IntentError::SignatureVerificationUnexpectedHeader => {
                IntentTransferError::SignatureVerificationUnexpectedHeader
            }
            IntentError::ParseFailedError(_) => IntentTransferError::ParseFailedError,
            IntentError::DeserializeFailedError(_) => IntentTransferError::DeserializeFailedError,
        }
    }
}
