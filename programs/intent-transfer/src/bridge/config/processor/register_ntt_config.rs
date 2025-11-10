use anchor_lang::prelude::*;
use anchor_lang::solana_program::bpf_loader_upgradeable;
use anchor_spl::token::Mint;
use crate::{bridge::config::ntt_config::{EXPECTED_NTT_CONFIG_SEED, ExpectedNttConfig}, error::IntentTransferError};

#[derive(Accounts)]
pub struct RegisterNttConfig<'info> {
    #[account(mut, address = program_data.upgrade_authority_address.ok_or(IntentTransferError::Unauthorized)?)]
    pub update_authority: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = update_authority,
        space = ExpectedNttConfig::DISCRIMINATOR.len() + ExpectedNttConfig::INIT_SPACE,
        seeds = [EXPECTED_NTT_CONFIG_SEED, mint.key().as_ref()],
        bump
    )]
    pub expected_ntt_config: Account<'info, ExpectedNttConfig>,

    /// CHECK: this is the address of the Ntt Manager program to register
    pub ntt_manager: UncheckedAccount<'info>,

    #[account(address = bpf_loader_upgradeable::get_program_data_address(&crate::ID))]
    pub program_data: Account<'info, ProgramData>,

    pub system_program: Program<'info, System>,
}

impl<'info> RegisterNttConfig<'info> {
    pub fn process(&mut self) -> Result<()> {
        self.expected_ntt_config.manager = self.ntt_manager.key();
        Ok(())
    }
}