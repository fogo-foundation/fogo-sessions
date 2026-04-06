use anchor_lang::prelude::*;

pub const INTENT_TRANSFER_NONCE_SEED: &[u8] = b"nonce";

#[account]
#[derive(InitSpace)]
pub struct Nonce {
    pub nonce: u64,
}
