use crate::config::access_control::*;
use crate::config::state::send_token_fee_config::{SendTokenFeeConfig, SEND_TOKEN_FEE_CONFIG_SEED};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
pub struct RegisterSendTokenFeeConfig<'info> {
    pub upgrade_authority: UpgradeAuthority<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = upgrade_authority.signer,
        space = SendTokenFeeConfig::DISCRIMINATOR.len() + SendTokenFeeConfig::INIT_SPACE,
        seeds = [SEND_TOKEN_FEE_CONFIG_SEED, mint.key().as_ref()],
        bump
    )]
    pub send_token_fee_config: Account<'info, SendTokenFeeConfig>,
    pub system_program: Program<'info, System>,
}

impl<'info> RegisterSendTokenFeeConfig<'info> {
    pub fn process(&mut self, ata_creation_fee: u64) -> Result<()> {
        self.send_token_fee_config.ata_creation_fee = ata_creation_fee;
        Ok(())
    }
}
