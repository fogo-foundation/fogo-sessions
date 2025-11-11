use anchor_lang::prelude::*;

pub const SEND_TOKEN_FEE_CONFIG_SEED: &[u8] = b"send_token_fee_config";

#[account]
#[derive(InitSpace)]
pub struct SendTokenFeeConfig {
    pub ata_creation_fee: u64,
}