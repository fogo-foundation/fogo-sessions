use anchor_lang::prelude::*;
use anchor_spl::token::spl_token::try_ui_amount_into_amount;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};
use solana_intents::SymbolOrMint;

use crate::{error::IntentTransferError, verify::verify_symbol_or_mint};

pub struct VerifyAndCollectAccounts<'a, 'info> {
    pub fee_source: &'a Account<'info, TokenAccount>,
    pub fee_destination: &'a Account<'info, TokenAccount>,
    pub fee_mint: &'a Account<'info, Mint>,
    pub fee_metadata: &'a Option<UncheckedAccount<'info>>,
    pub intent_transfer_setter: &'a UncheckedAccount<'info>,
    pub token_program: &'a Program<'info, Token>,
}
pub trait PaidInstruction<'info> {
    fn fee_amount(&self) -> u64;

    fn verify_and_collect_accounts<'a>(&'a self) -> VerifyAndCollectAccounts<'a, 'info>;

    fn verify_and_collect_fee(
        &self,
        intent_fee_amount: String,
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
        } = self.verify_and_collect_accounts();

        verify_symbol_or_mint(&fee_symbol_or_mint, fee_metadata, fee_mint)?;
        let intent_fee_amount = try_ui_amount_into_amount(intent_fee_amount, fee_mint.decimals)?;
        require_gte!(
            intent_fee_amount,
            self.fee_amount(),
            IntentTransferError::InsufficientFeeAmount
        );

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
            self.fee_amount(),
            fee_mint.decimals,
        )
    }
}
