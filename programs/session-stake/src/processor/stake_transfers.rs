use {
  anchor_lang::{
    prelude::*,
    solana_program::{
      instruction::{AccountMeta, Instruction},
    },
  },
  solana_stake_interface::{instruction::StakeInstruction, program::ID as STAKE_PROGRAM_ID},
  crate::processor::{
    extract_user_and_authority,
    invoke_stake_program,
    prepare_stake_account,
    invoke_stake_program_with_seeds,
  },
};

//We can't use TransferAccounts for split because there seems to be no way to
//  parameterize it so that destination stake can optionally be a signer...
#[derive(Accounts)]
pub struct Split<'info> {
  pub signer_or_session: Signer<'info>,

  /// CHECK: self-evident
  #[account(mut)]
  pub source_stake: AccountInfo<'info>,

  /// CHECK: self-evident
  #[account(mut)]
  pub destination_stake: Signer<'info>,

  /// CHECK: PDA [AUTHORITY_SEED, user.key]
  pub authority: AccountInfo<'info>,

  /// CHECK: self-evident
  #[account(address = solana_stake_interface::program::ID)]
  pub stake_program: AccountInfo<'info>,

  #[account(mut)]
  pub payer: Signer<'info>,

  pub system_program: Program<'info, System>,

  pub rent: Sysvar<'info, Rent>,
}

pub fn split(ctx: Context<Split>, lamports: u64) -> Result<()> {
  let (_, authority_key, _) =
    extract_user_and_authority(&ctx.accounts.signer_or_session)?;

  prepare_stake_account(
    &ctx.accounts.destination_stake.to_account_info(),
    &ctx.accounts.payer,
  )?;

  //we construct the split instruction manually because solana_stake_interface returns a vec
  //  with instructions we don't need because we prepare the stake account ourself
  let split_ix = Instruction::new_with_bincode(
    STAKE_PROGRAM_ID,
    &StakeInstruction::Split(lamports),
    vec![
      AccountMeta::new(ctx.accounts.source_stake      .key().clone(), false),
      AccountMeta::new(ctx.accounts.destination_stake .key().clone(), false),
      AccountMeta::new_readonly(authority_key                       , true ),
    ],
  );

  invoke_stake_program(
    &split_ix,
    &[
      ctx.accounts.source_stake      .to_account_info(),
      ctx.accounts.destination_stake .to_account_info(),
      ctx.accounts.authority         .to_account_info(),
    ],
    &ctx.accounts.signer_or_session,
  )
}

#[derive(Accounts)]
pub struct TransferAccounts<'info> {
  pub signer_or_session: Signer<'info>,

  /// CHECK: self-evident
  #[account(mut)]
  pub source_stake: AccountInfo<'info>,

  /// CHECK: self-evident
  #[account(mut)]
  pub destination_stake: AccountInfo<'info>,

  /// CHECK: PDA [AUTHORITY_SEED, user.key]
  pub authority: AccountInfo<'info>,

  /// CHECK: self-evident
  #[account(address = solana_stake_interface::program::ID)]
  pub stake_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Merge<'info> {
  pub common: TransferAccounts<'info>,

  pub clock: Sysvar<'info, Clock>,

  pub stake_history: Sysvar<'info, StakeHistory>,
}

pub fn merge(ctx: Context<Merge>) -> Result<()> {
  let (user, authority_key, authority_bump) =
    extract_user_and_authority(&ctx.accounts.common.signer_or_session)?;

  //we manually construct the merge instruction because solana_stake_interface - for god knows
  //  what reason - returns a vec. We could still take if from there, but manual construction
  //  here mirrors what we do in split
  let merge_ix = Instruction::new_with_bincode(
    STAKE_PROGRAM_ID,
    &StakeInstruction::Merge,
    vec![
      //this is the only stake program instruction where destination precedes source...
      AccountMeta::new(ctx.accounts.common.destination_stake .key().clone(), false),
      AccountMeta::new(ctx.accounts.common.source_stake      .key().clone(), false),
      AccountMeta::new_readonly(ctx.accounts.clock           .key().clone(), false),
      AccountMeta::new_readonly(ctx.accounts.stake_history   .key().clone(), false),
      AccountMeta::new_readonly(authority_key                              , true ),
    ],
  );

  invoke_stake_program_with_seeds(
    &merge_ix,
    &[
      ctx.accounts.common.destination_stake .to_account_info(),
      ctx.accounts.common.source_stake      .to_account_info(),
      ctx.accounts.clock                    .to_account_info(),
      ctx.accounts.stake_history            .to_account_info(),
      ctx.accounts.common.authority         .to_account_info(),
    ],
    &user,
    authority_bump,
  )
}

pub fn move_stake(ctx: Context<TransferAccounts>, lamports: u64) -> Result<()> {
  invoke_stake_program(
    &solana_stake_interface::instruction::move_stake(
      &ctx.accounts.source_stake      .key(),
      &ctx.accounts.destination_stake .key(),
      &ctx.accounts.authority         .key(),
      lamports,
    ),
    &[
      ctx.accounts.source_stake      .to_account_info(),
      ctx.accounts.destination_stake .to_account_info(),
      ctx.accounts.authority         .to_account_info(),
    ],
    &ctx.accounts.signer_or_session,
  )
}

pub fn move_lamports(ctx: Context<TransferAccounts>, lamports: u64) -> Result<()> {
  invoke_stake_program(
    &solana_stake_interface::instruction::move_lamports(
      &ctx.accounts.source_stake      .key(),
      &ctx.accounts.destination_stake .key(),
      &ctx.accounts.authority         .key(),
      lamports,
    ),
    &[
      ctx.accounts.source_stake      .to_account_info(),
      ctx.accounts.destination_stake .to_account_info(),
      ctx.accounts.authority         .to_account_info(),
    ],
    &ctx.accounts.signer_or_session,
  )
}