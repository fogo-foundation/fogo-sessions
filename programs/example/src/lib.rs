#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{Mint, Token, TokenAccount};
use fogo_sessions_sdk::token::instruction::transfer_checked;
use fogo_sessions_sdk::{session::Session, token::PROGRAM_SIGNER_SEED};

declare_id!("Examtz9qAwhxcADNFodNA2QpxK7SM9bCHyiaUvWvFBM3");

#[program]
pub mod example {
    use super::*;
    pub fn example_transfer(ctx: Context<ExampleTransfer>, amount: u64) -> Result<()> {
        let instruction = transfer_checked(
            ctx.accounts.token_program.key,
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.mint.key(),
            &ctx.accounts.sink.key(),
            &ctx.accounts.session_key.key(),
            &ctx.accounts.program_signer.key(),
            amount,
            ctx.accounts.mint.decimals,
        )?;
        invoke_signed(
            &instruction,
            &ctx.accounts.to_account_infos(),
            &[&[PROGRAM_SIGNER_SEED, &[ctx.bumps.program_signer]]],
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ExampleTransfer<'info> {
    /// CHECK: we check this using `Session::extract_user_from_session`
    #[account(signer)]
    pub session_key: AccountInfo<'info>,
    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [PROGRAM_SIGNER_SEED], bump)]
    pub program_signer: AccountInfo<'info>,
    #[account(mut, token::mint = mint, token::authority = Session::extract_user_from_session(&session_key, &crate::ID).map_err(|_| ProgramError::InvalidAccountData)?)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub sink: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
