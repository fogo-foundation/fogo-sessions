use anchor_lang::prelude::*;

pub const FEE_CONFIG_SEED: &[u8] = b"fee_config";

#[account]
#[derive(InitSpace)]
pub struct FeeConfig {
    pub intrachain_transfer_fee: u64,
    pub bridge_transfer_fee: u64,
}
