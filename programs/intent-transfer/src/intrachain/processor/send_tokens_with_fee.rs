use crate::{
    config::state::send_token_fee_config::{SendTokenFeeConfig, SEND_TOKEN_FEE_CONFIG_SEED},
    intrachain::processor::send_tokens::*,
};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{transfer_checked, TransferChecked};
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct SendTokensWithFee<'info> {
    pub send_tokens: SendTokens<'info>,
}

impl<'info> SendTokensWithFee<'info> {
    fn create_destination_account_and_collect_fee(
        &mut self,
        signer_seeds: &[&[&[u8]]],
    ) -> Result<()> {
        if self.send_tokens.destination.data_is_empty() {
            require_eq!(
                self.send_tokens.destination.key(),
                get_associated_token_address(
                    &self.destination_owner.key(),
                    &self.send_tokens.mint.key()
                ),
                ErrorCode::AccountNotAssociatedTokenAccount
            ); // This check is redundant because associated_token::create will fail if this is false but I feel better not trusting the callee

            associated_token::create(CpiContext::new(
                self.associated_token_program.to_account_info(),
                associated_token::Create {
                    payer: self.send_tokens.sponsor.to_account_info(),
                    associated_token: self.send_tokens.destination.to_account_info(),
                    authority: self.destination_owner.to_account_info(),
                    mint: self.send_tokens.mint.to_account_info(),
                    system_program: self.system_program.to_account_info(),
                    token_program: self.token_program.to_account_info(),
                },
            ))?;

            // collect the fee
            transfer_checked(
                CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    TransferChecked {
                        authority: self.send_tokens.intent_transfer_setter.to_account_info(),
                        from: self.fee_source.to_account_info(),
                        mint: self.fee_mint.to_account_info(),
                        to: self.fee_destination.to_account_info(),
                    },
                    signer_seeds,
                ),
                self.send_token_fee_config.ata_creation_fee,
                self.fee_mint.decimals,
            )?;
        }
        Ok(())
    }

    pub fn verify_and_send(&mut self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        self.create_destination_account_and_collect_fee(signer_seeds)?;
        self.send_tokens.verify_and_send(signer_seeds)
    }
}
