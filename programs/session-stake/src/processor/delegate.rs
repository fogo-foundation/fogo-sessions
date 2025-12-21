use {
  anchor_lang::prelude::*,
  crate::processor::invoke_stake_program,
};

#[derive(Accounts)]
pub struct Delegate<'info> {
  pub signer_or_session: Signer<'info>,

  /// CHECK: self-evident
  #[account(mut)]
  pub stake: AccountInfo<'info>,

  /// CHECK: PDA [AUTHORITY_SEED, user.key]
  pub authority: AccountInfo<'info>,

  /// CHECK: self-evident
  pub vote_account: AccountInfo<'info>,

  /// CHECK: self-evident
  #[account(address = solana_stake_interface::program::ID)]
  pub stake_program: AccountInfo<'info>,

  pub stake_history: Sysvar<'info, StakeHistory>,

  pub clock: Sysvar<'info, Clock>,
}

pub fn delegate(ctx: Context<Delegate>) -> Result<()> {
  let mut ix = solana_stake_interface::instruction::delegate_stake(
    &ctx.accounts.stake.key(),
    &ctx.accounts.authority.key(),
    &ctx.accounts.vote_account.key(),
  );

  //the StakeConfig account is actually unused (see comment in the delegate_stake builder)
  //  so we replace it with the stake_program to save on transaction space
  ix.accounts[4].pubkey = ctx.accounts.stake_program.key();

  invoke_stake_program(
    &ix,
    &[
      ctx.accounts.stake         .to_account_info(),
      ctx.accounts.vote_account  .to_account_info(),
      ctx.accounts.clock         .to_account_info(),
      ctx.accounts.stake_history .to_account_info(),
      ctx.accounts.stake_program .to_account_info(),
      ctx.accounts.authority     .to_account_info(),
    ],
    &ctx.accounts.signer_or_session,
  )
}
