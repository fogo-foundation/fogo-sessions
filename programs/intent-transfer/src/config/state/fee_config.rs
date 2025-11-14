use anchor_lang::prelude::*;

pub const FEE_CONFIG_SEED: &[u8] = b"fee_config";

#[account]
#[derive(InitSpace)]
pub struct FeeConfig {
    pub ata_creation_fee: u64,
    pub bridging_out_fee: u64,
}
