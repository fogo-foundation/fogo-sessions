use {
  anchor_lang::prelude::*,
  solana_stake_interface::state::StakeAuthorize as StakeAuthorizeNative,
  crate::{
    anchor_types::AuthorityType,
    processor::{get_authority_pda_and_bump, invoke_stake_program_with_seeds, StakeAccount},
  },
};

#[derive(Accounts)]
pub struct AuthorizeUser<'info> {
  pub user: Signer<'info>,

  #[account(mut)]
  pub stake: Account<'info, StakeAccount>,

  /// CHECK: PDA [AUTHORITY_SEED, user.key]
  pub authority: AccountInfo<'info>,

  pub clock: Sysvar<'info, Clock>,

  /// CHECK: Native stake program - address constraint verifies program ID
  #[account(address = solana_stake_interface::program::ID)]
  pub stake_program: AccountInfo<'info>,
}

pub fn authorize_user(
  ctx:            Context<AuthorizeUser>,
  new_authority:  Pubkey,
  authority_type: AuthorityType,
) -> Result<()> {
  let user = ctx.accounts.user.key();

  let stake_authorize = match authority_type {
    AuthorityType::Staker     => StakeAuthorizeNative::Staker,
    AuthorityType::Withdrawer => StakeAuthorizeNative::Withdrawer,
  };

  let (authority_key, authority_bump) = get_authority_pda_and_bump(&user)?;

  invoke_stake_program_with_seeds(
    &solana_stake_interface::instruction::authorize(
      &ctx.accounts.stake.key(),
      &authority_key,
      &new_authority,
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
