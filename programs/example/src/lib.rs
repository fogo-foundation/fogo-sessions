#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{Mint, Token, TokenAccount};
use fogo_sessions_sdk::{session::Session, token::PROGRAM_SIGNER_SEED};

declare_id!("Examtz9qAwhxcADNFodNA2QpxK7SM9bCHyiaUvWvFBM3");

#[program]
pub mod example {

    use fogo_sessions_sdk::token::instruction::transfer;

    use super::*;
    pub fn example_transfer(ctx: Context<ExampleTransfer>, amount: u64) -> Result<()> {
        let instruction = transfer(
            ctx.accounts.token_program.key,
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.sink.key(),
            &ctx.accounts.session_key.key(),
            &ctx.accounts.cpi_signer.key(),
            amount,
        )?;
        invoke_signed(
            &instruction,
            &ctx.accounts.to_account_infos(),
            &[&[PROGRAM_SIGNER_SEED, &[ctx.bumps.cpi_signer]]],
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ExampleTransfer<'info> {
    /// CHECK: we check this using `Session::check_signer_or_session_key`
    #[account(signer)]
    pub session_key: AccountInfo<'info>,
    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [PROGRAM_SIGNER_SEED], bump)]
    pub cpi_signer: AccountInfo<'info>,
    #[account(mut, token::mint = mint, token::authority = Session::check_signer_or_session_key(&session_key, &crate::ID).map_err(|_| ProgramError::InvalidAccountData)?)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub sink: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
