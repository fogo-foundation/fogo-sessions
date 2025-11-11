use crate::{
    error::IntentTransferError,
    intrachain::{message::Message, processor::NONCE_SEED},
    nonce::Nonce,
    verify::{verify_and_update_nonce, verify_signer_matches_source, verify_symbol_or_mint},
    INTENT_TRANSFER_SEED,
};
use anchor_lang::{prelude::*, solana_program::sysvar::instructions};
use anchor_spl::token::{
    spl_token::try_ui_amount_into_amount, transfer_checked, Mint, Token, TokenAccount,
    TransferChecked,
};
use anchor_lang::error::ErrorCode;
use chain_id::ChainId;
use solana_intents::Intent;

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

    /// CHECK: this account might be unitialized in the case of `send_tokens_with_fee` but it is checked after initialization in `SendTokens::verify_and_send`
    pub destination: UncheckedAccount<'info>,

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
        let destination_account_data = TokenAccount::try_deserialize(&mut self.destination.data.borrow().as_ref())?;
        require_eq!(destination_account_data.mint, self.mint.key(), ErrorCode::ConstraintTokenMint);
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
            destination_account_data.owner,
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
