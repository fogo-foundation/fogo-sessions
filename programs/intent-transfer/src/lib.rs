#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

declare_id!("Xfry4dW9m42ncAqm8LyEnyS5V6xu5DSJTMRQLiGkARD");

use crate::error::IntentTransferError;
use crate::message::Message;
use anchor_lang::{prelude::*, solana_program::sysvar::instructions};
use anchor_spl::token::{
    spl_token::try_ui_amount_into_amount, transfer_checked, Mint, Token, TokenAccount,
    TransferChecked,
};
use chain_id::ChainId;
use mpl_token_metadata::accounts::Metadata;
use solana_intents::{Intent, SymbolOrMint};

pub mod error;
mod message;

const INTENT_TRANSFER_SEED: &[u8] = b"intent_transfer";
const NONCE_SEED: &[u8] = b"nonce";

#[program]
pub mod intent_transfer {
    use super::*;

    #[instruction(discriminator = [0])]
    pub fn send_tokens<'info>(ctx: Context<'_, '_, '_, 'info, SendTokens<'info>>) -> Result<()> {
        ctx.accounts
            .verify_and_send(&[&[INTENT_TRANSFER_SEED, &[ctx.bumps.intent_transfer_setter]]])
    }
}

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

#[account]
#[derive(InitSpace)]
pub struct Nonce {
    pub nonce: u64,
}

impl<'info> SendTokens<'info> {
    fn verify_and_send(&mut self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
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

        match (symbol_or_mint, metadata) {
            (SymbolOrMint::Symbol(ref symbol), Some(metadata)) => {
                require_keys_eq!(
                    metadata.key(),
                    Metadata::find_pda(&mint.key()).0,
                    IntentTransferError::MetadataMismatch
                );
                require_eq!(
                    &Metadata::try_from(&metadata.to_account_info())?.symbol,
                    // Symbols in the metadata account are padded to 10 characters
                    &format!("{symbol:\0<10}"),
                    IntentTransferError::SymbolMismatch
                );
            }

            (SymbolOrMint::Symbol(_), None) => {
                return err!(IntentTransferError::MetadataAccountRequired);
            }

            (SymbolOrMint::Mint(ref mint), None) => {
                require_keys_eq!(*mint, mint.key(), IntentTransferError::MintMismatch);
            }

            (SymbolOrMint::Mint(_), Some(_)) => {
                return err!(IntentTransferError::MetadataAccountNotAllowed);
            }
        }

        require_keys_eq!(
            signer,
            source.owner,
            IntentTransferError::SignerSourceMismatch
        );
        require_keys_eq!(
            recipient,
            destination.owner,
            IntentTransferError::RecipientMismatch
        );

        require_eq!(
            new_nonce,
            nonce.nonce + 1,
            IntentTransferError::NonceFailure
        );

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
        nonce.nonce = new_nonce;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_session_setter_pda_derivation() {
        assert_eq!(
            Pubkey::from_str("EkYeW6iAtp2XsxsFZ2pDryf54qSND4RkGFCgMmX55vBL").unwrap(),
            Pubkey::find_program_address(&[INTENT_TRANSFER_SEED], &ID).0
        );
    }
}
