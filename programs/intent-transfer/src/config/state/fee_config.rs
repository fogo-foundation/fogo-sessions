use anchor_lang::prelude::*;
use anchor_spl::token::spl_token::try_ui_amount_into_amount;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};
use solana_intents::SymbolOrMint;

use crate::{error::IntentTransferError, verify::verify_symbol_or_mint};

pub const FEE_CONFIG_SEED: &[u8] = b"fee_config";

#[account]
#[derive(InitSpace)]
pub struct FeeConfig {
    pub ata_creation_fee: u64,
    pub bridging_out_fee: u64,
}

pub struct VerifyAndCollectAccounts<'a, 'info> {
    pub fee_source: &'a Account<'info, TokenAccount>,
    pub fee_destination: &'a Account<'info, TokenAccount>,
    pub fee_mint: &'a Account<'info, Mint>,
    pub fee_metadata: &'a Option<UncheckedAccount<'info>>,
    pub intent_transfer_setter: &'a UncheckedAccount<'info>,
    pub token_program: &'a Program<'info, Token>,
}

impl FeeConfig {
    pub fn verify_and_collect_ata_fee(
        &self,
        args: VerifyAndCollectAccounts,
        fee_amount: String,
        fee_symbol_or_mint: SymbolOrMint,
        signer_seeds: &[&[&[u8]]],
    ) -> Result<()> {
        self.verify_and_collect_fee(
            self.ata_creation_fee,
            args,
            fee_amount,
            fee_symbol_or_mint,
            signer_seeds,
        )
    }

    pub fn verify_and_collect_bridging_out_fee(
        &self,
        args: VerifyAndCollectAccounts,
        fee_amount: String,
        fee_symbol_or_mint: SymbolOrMint,
        signer_seeds: &[&[&[u8]]],
    ) -> Result<()> {
        self.verify_and_collect_fee(
            self.bridging_out_fee,
            args,
            fee_amount,
            fee_symbol_or_mint,
            signer_seeds,
        )
    }

    fn verify_and_collect_fee(
        &self,
        fee: u64,
        args: VerifyAndCollectAccounts,
        fee_amount: String,
        fee_symbol_or_mint: SymbolOrMint,
        signer_seeds: &[&[&[u8]]],
    ) -> Result<()> {
        let VerifyAndCollectAccounts {
            fee_source,
            fee_destination,
            fee_mint,
            fee_metadata,
            intent_transfer_setter,
            token_program,
        } = args;

        verify_symbol_or_mint(&fee_symbol_or_mint, fee_metadata, fee_mint)?;
        let fee_amount = try_ui_amount_into_amount(fee_amount, fee_mint.decimals)?;
        require_eq!(fee_amount, fee, IntentTransferError::FeeAmountMismatch);

        transfer_checked(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                TransferChecked {
                    authority: intent_transfer_setter.to_account_info(),
                    from: fee_source.to_account_info(),
                    mint: fee_mint.to_account_info(),
                    to: fee_destination.to_account_info(),
                },
                signer_seeds,
            ),
            fee,
            fee_mint.decimals,
        )
    }
}
