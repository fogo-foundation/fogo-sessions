use crate::error::IntentTransferError;
use anchor_lang::prelude::*;

pub const EXPECTED_NTT_CONFIG_SEED: &[u8] = b"expected_ntt_config";

#[account]
#[derive(InitSpace)]
pub struct ExpectedNttConfig {
    pub manager: Pubkey,
}

pub fn verify_ntt_manager(
    ntt_manager_key: Pubkey,
    expected_ntt_config: &Account<'_, ExpectedNttConfig>,
) -> Result<()> {
    require_keys_eq!(
        ntt_manager_key,
        expected_ntt_config.manager,
        IntentTransferError::InvalidNttManager
    );
    Ok(())
}
