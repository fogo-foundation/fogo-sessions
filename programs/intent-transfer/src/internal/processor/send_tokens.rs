use anchor_lang::{
    prelude::*,
    solana_program::sysvar::instructions,
};
use anchor_spl::token::{
    spl_token::try_ui_amount_into_amount, transfer_checked, Mint, Token, TokenAccount, TransferChecked,
};
use chain_id::ChainId;
use solana_intents::Intent;
use crate::{error::IntentTransferError, internal::message::Message, verify::{verify_and_update_nonce, verify_signer_matches_source, verify_symbol_or_mint}};

use crate::{INTENT_TRANSFER_SEED, nonce::Nonce};

const NONCE_SEED: &[u8] = b"nonce";

#[derive(Accounts)]
pub struct SendTokens<'info> {
    #[account(seeds = [chain_id::SEED], seeds::program = chain_id::ID, bump)]
    pub chain_id: Account<'info, ChainId>,

    /// CHECK: we check the address of this account
    #[account(address = instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,

    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [INTENT_TRANSFER_SEED], bump)]
    pub intent_transfer_setter: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,

    #[account(mut, token::mint = mint)]
    pub source: Account<'info, TokenAccount>,

    #[account(mut, token::mint = mint)]
    pub destination: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    pub metadata: Option<UncheckedAccount<'info>>,

    #[account(
        init_if_needed,
        payer = sponsor,
        space = Nonce::DISCRIMINATOR.len() + Nonce::INIT_SPACE,
        seeds = [NONCE_SEED, source.owner.key().as_ref()],
        bump
    )]
    pub nonce: Account<'info, Nonce>,

    #[account(mut)]
    pub sponsor: Signer<'info>,

    pub system_program: Program<'info, System>,
}


impl<'info> SendTokens<'info> {
    pub fn verify_and_send(&mut self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        let Self {
            chain_id,
            destination,
            intent_transfer_setter,
            metadata,
            mint,
            source,
            sysvar_instructions,
            token_program,
            nonce,
            sponsor: _,
            system_program: _,
        } = self;
        let Intent {
            message:
                Message {
                    amount,
                    chain_id: expected_chain_id,
                    recipient,
                    symbol_or_mint,
                    nonce: new_nonce,
                    version: _,
                },
            signer,
        } = Intent::load(sysvar_instructions.as_ref())
            .map_err(Into::<IntentTransferError>::into)?;

        if chain_id.chain_id != expected_chain_id {
            return err!(IntentTransferError::ChainIdMismatch);
        }

        verify_symbol_or_mint(&symbol_or_mint, metadata, mint)?;
        verify_signer_matches_source(signer, source.owner)?;

        require_keys_eq!(
            recipient,
            destination.owner,
            IntentTransferError::RecipientMismatch
        );

        verify_and_update_nonce(nonce, new_nonce)?;

        transfer_checked(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                TransferChecked {
                    authority: intent_transfer_setter.to_account_info(),
                    from: source.to_account_info(),
                    mint: mint.to_account_info(),
                    to: destination.to_account_info(),
                },
                signer_seeds,
            ),
            try_ui_amount_into_amount(amount, mint.decimals)?,
            mint.decimals,
        )?;

        Ok(())
    }
}
