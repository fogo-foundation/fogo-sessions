use {
  anchor_lang::prelude::*,
  anchor_spl::{
    associated_token::get_associated_token_address,
    token::{sync_native, Mint, SyncNative, Token, TokenAccount},
  },
  crate::{
    error::SessionStakeError,
    processor::{extract_user_and_authority, invoke_stake_program_with_seeds, StakeAccount},
    FOGO_MINT,
  },
};

#[derive(Accounts)]
pub struct Withdraw<'info> {
  pub signer_or_session: Signer<'info>,

  #[account(mut)]
  pub stake: Account<'info, StakeAccount>,

  /// CHECK: PDA [AUTHORITY_SEED, user.key]
  #[account(mut)]
  pub authority: AccountInfo<'info>,

  #[account(mut)]
  pub user_fogo: Account<'info, TokenAccount>,

  #[account(address = FOGO_MINT)]
  pub fogo_mint: Account<'info, Mint>,

  pub clock: Sysvar<'info, Clock>,

  pub stake_history: Sysvar<'info, StakeHistory>,

  /// CHECK: self-evident
  #[account(address = solana_stake_interface::program::ID)]
  pub stake_program: AccountInfo<'info>,

  pub token_program: Program<'info, Token>,
}

pub fn withdraw(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
  let (user, authority_key, authority_bump) =
    extract_user_and_authority(&ctx.accounts.signer_or_session)?;

  //if executed within a session, only allow withdrawals to the ATA owned by the user
  if user != ctx.accounts.signer_or_session.key() {
    let expected_ata = get_associated_token_address(&user, &FOGO_MINT);
    let user_fogo = &ctx.accounts.user_fogo;
    require_eq!(user_fogo.key(), expected_ata, SessionStakeError::InvalidDestinationTokenAccount);
    require_eq!(user_fogo.owner, user,         SessionStakeError::InvalidDestinationTokenAccount);
  }

  invoke_stake_program_with_seeds(
    &solana_stake_interface::instruction::withdraw(
      &ctx.accounts.stake.key(),
      &authority_key,
      &ctx.accounts.user_fogo.key(),
      lamports,
      None,
    ),
    &[
      ctx.accounts.stake         .to_account_info(),
      ctx.accounts.user_fogo     .to_account_info(),
      ctx.accounts.clock         .to_account_info(),
      ctx.accounts.stake_history .to_account_info(),
      ctx.accounts.authority     .to_account_info(),
    ],
    &user,
    authority_bump,
  )?;

  sync_native(CpiContext::new(
    ctx.accounts.token_program.to_account_info(),
    SyncNative { account: ctx.accounts.user_fogo.to_account_info() },
  ))
}
