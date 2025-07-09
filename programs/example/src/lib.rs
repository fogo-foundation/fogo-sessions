#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use fogo_sessions_sdk::cpi::{
    in_session_token_transfer, BumpOrProgramId, InSessionTokenTransferAccounts,
};
use fogo_sessions_sdk::{Session, PROGRAM_SIGNER_SEED};

declare_id!("Examtz9qAwhxcADNFodNA2QpxK7SM9bCHyiaUvWvFBM3");

#[program]
pub mod example {
    use super::*;
    pub fn example_transfer(ctx: Context<ExampleTransfer>, amount: u64) -> Result<()> {
        in_session_token_transfer(
            ctx.accounts.token_program.key,
            ctx.accounts.to_in_session_token_transfer_accounts(),
            amount,
            ctx.accounts.mint.decimals,
            BumpOrProgramId::Bump(ctx.bumps.cpi_signer),
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
    #[account(mut, associated_token::mint = mint, associated_token::authority = session_key.get_user_checked(&ID)?)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub sink: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

impl<'info> ExampleTransfer<'info> {
    pub fn to_in_session_token_transfer_accounts(&self) -> InSessionTokenTransferAccounts<'info> {
        InSessionTokenTransferAccounts {
            source: self.user_token_account.to_account_info(),
            mint: self.mint.to_account_info(),
            destination: self.sink.to_account_info(),
            session_key: self.session_key.to_account_info(),
            cpi_signer: self.cpi_signer.to_account_info(),
        }
    }
}
