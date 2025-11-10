use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Nonce {
    pub nonce: u64,
}