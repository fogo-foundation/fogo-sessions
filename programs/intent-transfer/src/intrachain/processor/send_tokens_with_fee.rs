use crate::{
    INTENT_TRANSFER_SEED, config::send_token_fee_config::{SEND_TOKEN_FEE_CONFIG_SEED, SendTokenFeeConfig}, intrachain::processor::{NONCE_SEED, send_tokens::SendTokens}, nonce::Nonce, verify::{verify_and_update_nonce, verify_signer_matches_source, verify_symbol_or_mint}
};
use anchor_lang::{prelude::*, solana_program::sysvar::instructions, solana_program::incinerator};
use anchor_spl::{associated_token::{self, AssociatedToken}, token::{
    Mint, Token, TokenAccount
}};
use chain_id::ChainId;

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

    /// CHECK: this is the destination token account, it might be unitialized
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

    #[account(mut, token::mint = fee_mint)]
    pub fee_source: Account<'info, TokenAccount>,

    #[account(init_if_needed, payer = sponsor, associated_token::mint = fee_mint, associated_token::authority = system_program)] // sending to the system program is equivalent to burning: https://github.com/solana-program/token/blob/main/program/src/processor.rs#L620
    pub fee_destination: Account<'info, TokenAccount>,

    pub fee_mint: Account<'info, Mint>,

    #[account(seeds = [SEND_TOKEN_FEE_CONFIG_SEED, fee_mint.key().as_ref()], bump)]
    pub send_token_fee_config: Account<'info, SendTokenFeeConfig>,

    pub associated_token_program: Program<'info, AssociatedToken>,
}

// impl<'info> SendTokensWithFee<'info> {
//     fn as_send_tokens(self, destination: Account<'info, TokenAccount>) -> SendTokens<'info> {
//         SendTokens {
//             chain_id: self.chain_id,
//             destination,
//             intent_transfer_setter: self.intent_transfer_setter,
//             metadata: self.metadata,
//             mint: self.mint,
//             source: self.source,
//             sysvar_instructions: self.sysvar_instructions,
//             token_program: self.token_program,
//             nonce: self.nonce,
//             sponsor: self.sponsor,
//             system_program: self.system_program,
//         }
//     }
// }

// impl<'info> SendTokensWithFee<'info> {
//     pub fn verify_and_send(&mut self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
//         let desnation_account_info = self.destination.to_account_info().to_owned();
//         let destination = Account::<'info, TokenAccount>::try_from(&desnation_account_info).unwrap();
//         let mut send_tokens = self.as_send_tokens(destination);
//         send_tokens.verify_and_send(signer_seeds)?;
//         Ok(())
//     }
// }