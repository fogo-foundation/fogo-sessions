use crate::{
    config::state::send_token_fee_config::{SendTokenFeeConfig, SEND_TOKEN_FEE_CONFIG_SEED},
    intrachain::processor::send_tokens::*,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer_checked, TransferChecked};
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{Mint, Token, TokenAccount},
};
use anchor_spl::associated_token::get_associated_token_address;

#[derive(Accounts)]
pub struct SendTokensWithFee<'info> {
    pub send_tokens: SendTokens<'info>,

    #[account(mut, token::mint = fee_mint, token::authority = send_tokens.source.owner )]
    pub fee_source: Account<'info, TokenAccount>,

    #[account(init_if_needed, payer = send_tokens.sponsor, associated_token::mint = fee_mint, associated_token::authority = send_tokens.sponsor)]
    pub fee_destination: Account<'info, TokenAccount>,

    pub fee_mint: Account<'info, Mint>,

    #[account(seeds = [SEND_TOKEN_FEE_CONFIG_SEED, fee_mint.key().as_ref()], bump)]
    pub send_token_fee_config: Account<'info, SendTokenFeeConfig>,

    /// CHECK: This account is only used and checked against `destination` in the `create_destination_account_and_collect_fee` when the `destination` account is not yet initialized
    pub destination_owner: AccountInfo<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    // These are duplicate because anchor is dumb and doesn't detect they are already in send_tokens, but it's fine because it only adds two bytes to the transaction size
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> SendTokensWithFee<'info> {
    fn create_destination_account_and_collect_fee(
        &mut self,
        signer_seeds: &[&[&[u8]]],
    ) -> Result<()> {
        match TokenAccount::try_deserialize(
            &mut self.send_tokens.destination.data.borrow().as_ref(),
        ) {
            Err(_) => {
                require_eq!(self.send_tokens.destination.key(), get_associated_token_address(&self.destination_owner.key(), &self.send_tokens.mint.key()), ErrorCode::ConstraintAddress); // This check is redundant because associated_token::create will fail if this is false
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
                )
            }
            Ok(_) => Ok(()),
        }
    }

    pub fn verify_and_send(&mut self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        self.create_destination_account_and_collect_fee(signer_seeds)?;
        self.send_tokens.verify_and_send(signer_seeds)
    }
}
