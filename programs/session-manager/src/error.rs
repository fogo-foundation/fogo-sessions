use anchor_lang::prelude::*;

#[error_code]
pub enum SessionManagerError{
    InvalidSignature,
    InvalidMessage,
    InvalidArgument
}