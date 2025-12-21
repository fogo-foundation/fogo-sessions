use {
  anchor_lang::{prelude::*, solana_program},
  solana_intents::Intent,
  crate::{
    error::SessionStakeError,
    processor::{get_authority_pda_and_bump, invoke_stake_program_with_seeds, StakeAccount},
    state::{Nonce, NONCE_SEED},
  },
};

#[derive(Accounts)]
pub struct AuthorizeIntent<'info> {
  #[account(seeds = [chain_id::SEED], seeds::program = chain_id::ID, bump)]
  pub chain_id: Account<'info, chain_id::ChainId>,

  /// CHECK: self-evident
  #[account(address = solana_program::sysvar::instructions::ID)]
  pub sysvar_instructions: AccountInfo<'info>,

  #[account(mut)]
  pub stake: Account<'info, StakeAccount>,

  /// CHECK: PDA [AUTHORITY_SEED, user.key]
  pub authority: AccountInfo<'info>,

  #[account(
    init_if_needed,
    payer = sponsor,
    space = Nonce::DISCRIMINATOR.len() + Nonce::INIT_SPACE,
    seeds = [NONCE_SEED, authority.key().as_ref()],
    bump
  )]
  pub nonce: Account<'info, Nonce>,

  #[account(mut)]
  pub sponsor: Signer<'info>,

  pub clock: Sysvar<'info, Clock>,

  pub system_program: Program<'info, System>,

  /// CHECK: Native stake program - address constraint verifies program ID
  #[account(address = solana_stake_interface::program::ID)]
  pub stake_program: AccountInfo<'info>,
}

pub fn authorize_intent(ctx: Context<AuthorizeIntent>) -> Result<()> {
  let Intent {
    message,
    signer: user,
  } = Intent::<crate::message::AuthorizeMessage>::load(ctx.accounts.sysvar_instructions.as_ref())
    .map_err(|_| error!(SessionStakeError::InvalidArgument))?;

  require_keys_eq!(
    message.stake_account,
    ctx.accounts.stake.key(),
    SessionStakeError::InvalidArgument,
  );
  require_eq!(
    &ctx.accounts.chain_id.chain_id,
    &message.chain_id,
    SessionStakeError::InvalidArgument,
  );

  let stake_authorize = message.stake_authorize()
    .ok_or(error!(SessionStakeError::InvalidArgument))?;

  require_eq!(message.nonce, ctx.accounts.nonce.nonce + 1, SessionStakeError::InvalidArgument);
  ctx.accounts.nonce.nonce = message.nonce;

  let (authority_key, authority_bump) = get_authority_pda_and_bump(&user)?;
  invoke_stake_program_with_seeds(
    &solana_stake_interface::instruction::authorize(
      &ctx.accounts.stake.key(),
      &authority_key,
      &message.new_authority,
      stake_authorize,
      None,
    ),
    &[
      ctx.accounts.stake     .to_account_info(),
      ctx.accounts.clock     .to_account_info(),
      ctx.accounts.authority .to_account_info(),
    ],
    &user,
    authority_bump,
  )
}
