#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{Mint, Token, TokenAccount};
use fogo_sessions_sdk::session::is_session;
use fogo_sessions_sdk::token::instruction::transfer_checked;
use fogo_sessions_sdk::{session::Session, token::PROGRAM_SIGNER_SEED};
use anchor_spl::associated_token::get_associated_token_address;
use spl_token::instruction::transfer;

declare_id!("Examtz9qAwhxcADNFodNA2QpxK7SM9bCHyiaUvWvFBM3");

#[program]
pub mod example {
    use super::*;
    pub fn example_transfer(ctx: Context<ExampleTransfer>, amount: u64) -> Result<()> {
        // Extract the user public key from the signing account
        let user = Session::extract_user_from_signer_or_session(&ctx.accounts.signer_or_session, &crate::ID).map_err(|_| ProgramError::InvalidAccountData)?;

        // Check that user_token_account is the user's token associated account
        require_eq!(get_associated_token_address(&user, &ctx.accounts.mint.key()), ctx.accounts.user_token_account.key());

        let instruction = transfer_checked(
            ctx.accounts.token_program.key,
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.mint.key(),
            &ctx.accounts.sink.key(),
            &ctx.accounts.signer_or_session.key(),
            ctx.accounts
                .program_signer
                .as_ref()
                .map(|account_info| account_info.key()).as_ref(),
            amount,
            ctx.accounts.mint.decimals,
        )?;

        let is_session = is_session(&ctx.accounts.signer_or_session);

        match (is_session, ctx.accounts.program_signer.as_ref()) {
            (_, Some(_)) => {
                invoke_signed(&instruction, &ctx.accounts.to_account_infos(), &[&[PROGRAM_SIGNER_SEED, &[ctx.bumps.program_signer.expect("program_signer is some")]]])?;
            }
            (false, None) => {
                // If it's not a session, it's okay to not provide the program signer
                invoke(&instruction, &ctx.accounts.to_account_infos())?;
            }
            (true, None) => {
                // Program signer is required if it's a session
                return Err(ProgramError::NotEnoughAccountKeys.into());
            }
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ExampleTransfer<'info> {
    /// This is either the user or a session representing the user
    pub signer_or_session: Signer<'info>,
    /// If within a session, this account is needed to sign token transfers in addition to the session key.
    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [PROGRAM_SIGNER_SEED], bump)]
    pub program_signer: Option<AccountInfo<'info>>,
    #[account(mut, token::mint = mint)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(mut, token::mint = mint)]
    pub sink: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
