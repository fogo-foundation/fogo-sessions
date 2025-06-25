#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{Token, TokenAccount};
use fogo_sessions_sdk::{Session, PROGRAM_SIGNER_SEED};
use spl_token::instruction::transfer;

declare_id!("91VRuqpFoaPnU1aj8P7rEY53yFUn2yEFo831SVbRaq45");

#[program]
pub mod example {
    use super::*;
    pub fn example_transfer(ctx: Context<ExampleTransfer>, amount: u64) -> Result<()> {
        let mut instruction = transfer(
            ctx.accounts.token_program.key,
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.sink.key(),
            &ctx.accounts.session_key.key(),
            &[ctx.accounts.cpi_signer.key],
            amount,
        )?;
        instruction.accounts[2].is_signer = true;
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
    #[account(signer)]
    pub session_key: Account<'info, Session>,
    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [PROGRAM_SIGNER_SEED], bump)]
    pub cpi_signer: AccountInfo<'info>,
    #[account(mut, token::authority = session_key.get_user_checked(&ID)?)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub sink: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
