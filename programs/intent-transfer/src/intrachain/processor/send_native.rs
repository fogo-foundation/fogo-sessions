use crate::{
    config::state::fee_config::{FeeConfig, FEE_CONFIG_SEED},
    error::IntentTransferError,
    intrachain::message::Message,
    nonce::{self, Nonce},
    verify::{verify_and_update_nonce, verify_signer_matches_source},
    INTENT_TRANSFER_SEED,
};
use anchor_lang::{
    prelude::*,
    solana_program::{
        instruction::{AccountMeta, Instruction},
        program,
        sysvar::instructions,
    },
    system_program,
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{spl_token::try_ui_amount_into_amount, Mint, Token},
};
use chain_id::ChainId;
use solana_intents::{Intent, SymbolOrMint};

const FOGO_DECIMALS: u8 = 9;
const SYSTEM_PROGRAM_INTENT_TRANSFER_DISCRIMINATOR: u32 = 4_000_001;

#[derive(Accounts)]
pub struct SendNative<'info> {
    #[account(seeds = [chain_id::SEED], seeds::program = chain_id::ID, bump)]
    pub chain_id: Account<'info, ChainId>,

    /// CHECK: we check the address of this account
    #[account(address = instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,

    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [INTENT_TRANSFER_SEED], bump)]
    pub intent_transfer_setter: UncheckedAccount<'info>,

    /// CHECK: this is checked against the intent message
    #[account(mut)]
    pub source: UncheckedAccount<'info>,

    /// CHECK: this is checked against the intent message
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = sponsor,
        space = Nonce::DISCRIMINATOR.len() + Nonce::INIT_SPACE,
        seeds = [nonce::INTENT_TRANSFER_NONCE_SEED, source.key().as_ref()],
        bump
    )]
    pub nonce: Account<'info, Nonce>,

    #[account(mut)]
    pub sponsor: Signer<'info>,

    /// CHECK: unused
    pub fee_source: UncheckedAccount<'info>,

    /// CHECK: unused
    pub fee_destination: UncheckedAccount<'info>,

    pub fee_mint: Account<'info, Mint>,

    pub fee_metadata: Option<UncheckedAccount<'info>>,

    #[account(seeds = [FEE_CONFIG_SEED, fee_mint.key().as_ref()], bump)]
    pub fee_config: Account<'info, FeeConfig>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> SendNative<'info> {
    pub fn verify_and_send(&mut self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        let Self {
            chain_id,
            destination,
            intent_transfer_setter,
            sysvar_instructions,
            nonce,
            source,
            ..
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
                    fee_amount: _,
                    fee_symbol_or_mint: _,
                },
            signer,
        } = Intent::load(sysvar_instructions.as_ref())
            .map_err(Into::<IntentTransferError>::into)?;

        if chain_id.chain_id != expected_chain_id {
            return err!(IntentTransferError::ChainIdMismatch);
        }

        if symbol_or_mint != SymbolOrMint::Symbol(String::from("FOGO")) {
            return err!(IntentTransferError::SymbolMismatch);
        }

        verify_signer_matches_source(signer, source.key())?;

        require_keys_eq!(
            recipient,
            destination.key(),
            IntentTransferError::RecipientMismatch
        );

        verify_and_update_nonce(nonce, new_nonce)?;

        program::invoke_signed(
            &Instruction {
                program_id: system_program::ID,
                accounts: vec![
                    AccountMeta::new(source.key(), false),
                    AccountMeta::new(destination.key(), false),
                    AccountMeta::new_readonly(intent_transfer_setter.key(), true),
                ],
                data: SYSTEM_PROGRAM_INTENT_TRANSFER_DISCRIMINATOR
                    .to_le_bytes()
                    .into_iter()
                    .chain(try_ui_amount_into_amount(amount, FOGO_DECIMALS)?.to_le_bytes())
                    .collect(),
            },
            &[
                source.to_account_info(),
                destination.to_account_info(),
                intent_transfer_setter.to_account_info(),
            ],
            signer_seeds,
        )?;
        Ok(())
    }
}
