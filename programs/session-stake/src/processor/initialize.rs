use {
  anchor_lang::{prelude::*, solana_program::program::invoke},
  solana_stake_interface::state::{Authorized, Lockup},
  crate::processor::{extract_user_and_authority, prepare_stake_account},
};

#[derive(Accounts)]
pub struct Initialize<'info> {
  pub signer_or_session: Signer<'info>,

  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(mut)]
  pub stake: Signer<'info>,

  /// CHECK: self-evident
  #[account(address = solana_stake_interface::program::ID)]
  pub stake_program: AccountInfo<'info>,

  pub system_program: Program<'info, System>,

  pub rent: Sysvar<'info, Rent>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
  prepare_stake_account(&ctx.accounts.stake.to_account_info(), &ctx.accounts.payer)?;

  let (_, authority, _) = extract_user_and_authority(&ctx.accounts.signer_or_session)?;
  let authorized = Authorized { staker: authority, withdrawer: authority };
  let lockup = Lockup::default();
  invoke(
    &solana_stake_interface::instruction::initialize(
      &ctx.accounts.stake.key(),
      &authorized,
      &lockup,
    ),
    &[
      ctx.accounts.stake .to_account_info(),
      ctx.accounts.rent  .to_account_info(),
    ]
  )?;

  Ok(())
}
