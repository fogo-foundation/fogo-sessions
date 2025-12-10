use crate::config::access_control::*;
use crate::config::state::ntt_config::{ExpectedNttConfig, EXPECTED_NTT_CONFIG_SEED};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
pub struct RegisterNttConfig<'info> {
    pub upgrade_authority: UpgradeAuthority<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = upgrade_authority.signer,
        space = ExpectedNttConfig::DISCRIMINATOR.len() + ExpectedNttConfig::INIT_SPACE,
        seeds = [EXPECTED_NTT_CONFIG_SEED, mint.key().as_ref()],
        bump
    )]
    pub expected_ntt_config: Account<'info, ExpectedNttConfig>,

    /// CHECK: this is the address of the Ntt Manager program to register
    pub ntt_manager: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> RegisterNttConfig<'info> {
    pub fn process(&mut self) -> Result<()> {
        self.expected_ntt_config.manager = self.ntt_manager.key();
        Ok(())
    }
}
