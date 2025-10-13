#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

use crate::error::TollboothError;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{Token, TokenAccount};
use fogo_sessions_sdk::{
    session::Session, token::instruction::transfer, token::PROGRAM_SIGNER_SEED,
};
mod error;

declare_id!("too1LGRdFnP58TP5P4cmRsZT5BDEM38WdQxnFgD89hC");

#[program]
pub mod tollbooth {
    use super::*;

    #[instruction(discriminator = [0])]
    pub fn pay_fee<'info>(
        ctx: Context<'_, '_, '_, 'info, PayFee<'info>>,
        amount: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts
                .session
                .get_fee_collector_owner_checked()?
                .map(|fee_collector_owner| {
                    fee_collector_owner == ctx.accounts.destination.owner
                })
                .unwrap_or(false),
            TollboothError::InvalidDestination
        );
        let instruction = transfer(
            ctx.accounts.token_program.key,
            &ctx.accounts.source.key(),
            &ctx.accounts.destination.key(),
            &ctx.accounts.session.key(),
            Some(&ctx.accounts.program_signer.key()),
            amount,
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
pub struct PayFee<'info> {
    #[account(signer)]
    pub session: Account<'info, Session>,
    /// CHECK: this is just a PDA signer for token program CPIs
    #[account(seeds = [PROGRAM_SIGNER_SEED], bump)]
    pub program_signer: AccountInfo<'info>,
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
