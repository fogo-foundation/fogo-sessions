use crate::config::access_control::*;
use crate::config::state::fee_config::{FeeConfig, FEE_CONFIG_SEED};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
pub struct RegisterFeeConfig<'info> {
    pub upgrade_authority: UpgradeAuthority<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = upgrade_authority.signer,
        space = FeeConfig::DISCRIMINATOR.len() + FeeConfig::INIT_SPACE,
        seeds = [FEE_CONFIG_SEED, mint.key().as_ref()],
        bump
    )]
    pub fee_config: Account<'info, FeeConfig>,
    pub system_program: Program<'info, System>,
}

impl<'info> RegisterFeeConfig<'info> {
    pub fn process(&mut self, fee_config: FeeConfig) -> Result<()> {
        *self.fee_config = fee_config;
        Ok(())
    }
}
