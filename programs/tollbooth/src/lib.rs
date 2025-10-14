#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

use crate::error::TollboothError;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{Mint, Token, TokenAccount};
use fogo_sessions_sdk::{
    session::Session, token::instruction::transfer, token::PROGRAM_SIGNER_SEED,
};
mod error;

declare_id!("toLLShH3xqYgVZuNUotUgQNWZ3Ldwrq9qCp27sJBaDp");

const TOLL_RECIPIENT_SEED: &[u8] = b"toll_recipient";

#[program]
pub mod tollbooth {
    use super::*;

    #[instruction(discriminator = [0])]
    pub fn pay_toll<'info>(
        ctx: Context<'_, '_, '_, 'info, PayToll<'info>>,
        amount: u64,
    ) -> Result<()> {
        require_eq!(
            get_associated_token_address(
                &ctx.accounts.session.get_user_checked(&crate::ID)?,
                &ctx.accounts.mint.key()
            ),
            ctx.accounts.source.key(),
            TollboothError::InvalidSource
        );

        require_eq!(
            get_associated_token_address(
                &Pubkey::find_program_address(
                    &[
                        TOLL_RECIPIENT_SEED,
                        ctx.accounts.session.get_domain_id_checked()?.as_ref(),
                    ],
                    &crate::ID
                )
                .0,
                &ctx.accounts.mint.key()
            ),
            ctx.accounts.destination.key(),
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
pub struct PayToll<'info> {
    #[account(signer)]
    pub session: Account<'info, Session>,
    /// CHECK: this is just a PDA signer for token program CPIs
    #[account(seeds = [PROGRAM_SIGNER_SEED], bump)]
    pub program_signer: AccountInfo<'info>,
    #[account(mut, token::mint = mint)]
    pub source: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint)]
    pub destination: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_program_id_matches_sdk() {
        assert_eq!(ID, fogo_sessions_sdk::tollbooth::TOLLBOOTH_PROGRAM_ID);
    }
}
