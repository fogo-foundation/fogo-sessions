use crate::{
    INTENT_TRANSFER_SEED, config::send_token_fee_config::{SEND_TOKEN_FEE_CONFIG_SEED, SendTokenFeeConfig}, intrachain::processor::{NONCE_SEED, send_tokens::SendTokens}, nonce::Nonce, verify::{verify_and_update_nonce, verify_signer_matches_source, verify_symbol_or_mint}
};
use anchor_lang::{prelude::*, solana_program::sysvar::instructions, solana_program::incinerator};
use anchor_spl::{associated_token::{self, AssociatedToken}, token::{
    Mint, Token, TokenAccount
}};
use chain_id::ChainId;
use anchor_spl::token::{
    transfer_checked,
    TransferChecked,
};

#[derive(Accounts)]
pub struct SendTokensWithFee<'info> {
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

    /// CHECK: this is the destination token account, it might be unitialized in the case of send_tokens_with_fee
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

    #[account(mut, token::mint = fee_mint, token::authority = source.owner )]
    pub fee_source: Account<'info, TokenAccount>,

    #[account(init_if_needed, payer = sponsor, associated_token::mint = fee_mint, associated_token::authority = system_program)] // sending to the system program is equivalent to burning: https://github.com/solana-program/token/blob/main/program/src/processor.rs#L620
    pub fee_destination: Account<'info, TokenAccount>,

    pub fee_mint: Account<'info, Mint>,

    #[account(seeds = [SEND_TOKEN_FEE_CONFIG_SEED, fee_mint.key().as_ref()], bump)]
    pub send_token_fee_config: Account<'info, SendTokenFeeConfig>,

    /// CHECK: ATA initialization will fail if this owner is not the same as the source owner
    pub destination_owner: AccountInfo<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Into<SendTokens<'info>> for SendTokensWithFee<'info> {
    fn into(self) -> SendTokens<'info> {
        SendTokens {
            chain_id: self.chain_id,
            destination: self.destination,
            intent_transfer_setter: self.intent_transfer_setter,
            metadata: self.metadata,
            mint: self.mint,
            source: self.source,
            sysvar_instructions: self.sysvar_instructions,
            token_program: self.token_program,
            nonce: self.nonce,
            sponsor: self.sponsor,
            system_program: self.system_program,
        }
    }
}

impl<'info> SendTokensWithFee<'info> {
    fn create_destination_account_and_collect_fee(&mut self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        match TokenAccount::try_deserialize(&mut self.destination.data.borrow().as_ref()) {
            Err(_) => {
                associated_token::create(CpiContext::new(
                    self.associated_token_program.to_account_info(),
                    associated_token::Create {
                        payer: self.sponsor.to_account_info(),
                        associated_token: self.destination.to_account_info(),
                        authority: self.destination_owner.to_account_info(),
                        mint: self.mint.to_account_info(),
                        system_program: self.system_program.to_account_info(),
                        token_program: self.token_program.to_account_info(),
                    },
                ))?;

                transfer_checked(
                    CpiContext::new_with_signer(
                        self.token_program.to_account_info(),
                        TransferChecked {
                            authority: self.intent_transfer_setter.to_account_info(),
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
            Ok(_) => {
                Ok(())
            }
        }
    }

    pub fn verify_and_send(mut self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        self.create_destination_account_and_collect_fee(&signer_seeds)?;
        let mut send_tokens: SendTokens<'info> = self.into();
        send_tokens.verify_and_send(signer_seeds)
    }
}