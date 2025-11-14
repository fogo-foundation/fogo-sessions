use crate::{
    config::state::fee_config::{
        FeeConfig, VerifyAndCollectArgs, FEE_CONFIG_SEED,
    },
    error::IntentTransferError,
    intrachain::message::Message,
    nonce::Nonce,
    verify::{verify_and_update_nonce, verify_signer_matches_source, verify_symbol_or_mint},
    INTENT_TRANSFER_SEED,
};
use anchor_lang::{prelude::*, solana_program::sysvar::instructions};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{
        spl_token::try_ui_amount_into_amount, transfer_checked, Mint, Token, TokenAccount,
        TransferChecked,
    },
};
use chain_id::ChainId;
use solana_intents::Intent;

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

    #[account(mut, token::mint = mint)]
    pub source: Account<'info, TokenAccount>,

    #[account(init_if_needed, payer = sponsor, associated_token::mint = mint, associated_token::authority = destination_owner)]
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

    /// CHECK: This account is checked against the signed message
    pub destination_owner: AccountInfo<'info>,

    #[account(mut, token::mint = fee_mint, token::authority = source.owner )]
    pub fee_source: Account<'info, TokenAccount>,

    #[account(init_if_needed, payer = sponsor, associated_token::mint = fee_mint, associated_token::authority = sponsor)]
    pub fee_destination: Account<'info, TokenAccount>,

    pub fee_mint: Account<'info, Mint>,

    pub fee_metadata: Option<UncheckedAccount<'info>>,

    #[account(seeds = [FEE_CONFIG_SEED, fee_mint.key().as_ref()], bump)]
    pub send_token_fee_config: Account<'info, FeeConfig>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
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
            destination_owner,
            fee_source,
            fee_destination,
            fee_mint,
            fee_metadata,
            send_token_fee_config,
            system_program: _,
            associated_token_program: _,
            sponsor: _,
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
                    fee_amount,
                    fee_symbol_or_mint,
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
            destination_owner.key(),
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

        send_token_fee_config.verify_and_collect_ata_fee(
            VerifyAndCollectArgs {
                fee_source,
                fee_destination,
                fee_mint,
                fee_metadata,
                intent_transfer_setter,
                token_program,
            },
            fee_amount,
            fee_symbol_or_mint,
            signer_seeds,
        )
    }
}
