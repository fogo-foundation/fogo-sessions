#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`
#![allow(deprecated)] // warning: use of deprecated method `anchor_lang::prelude::AccountInfo::<'a>::realloc`: Use AccountInfo::resize() instead

mod error;
mod processor;
mod anchor_types;
mod state;
mod message;

use {
  anchor_lang::prelude::*,
  processor::*,
  anchor_types::AuthorityType,
};

declare_id!("sStk2sQ71PdRbmfmMxivMsnowytotYGpDaQrp4WN7qj");

pub const FOGO_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
pub const TMP_FOGO_SEED: &[u8] = b"tmp_fogo";

#[program]
pub mod session_stake {
  use super::*;

  #[instruction(discriminator = [0])]
  pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    processor::initialize(ctx)
  }

  #[instruction(discriminator = [1])]
  pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
    processor::deposit(ctx, lamports)
  }

  #[instruction(discriminator = [2])]
  pub fn withdraw(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
    processor::withdraw(ctx, lamports)
  }

  #[instruction(discriminator = [3])]
  pub fn delegate(ctx: Context<Delegate>) -> Result<()> {
    processor::delegate(ctx)
  }

  #[instruction(discriminator = [4])]
  pub fn deactivate(ctx: Context<Deactivate>) -> Result<()> {
    processor::deactivate(ctx)
  }

  #[instruction(discriminator = [5])]
  pub fn authorize_user(
    ctx: Context<AuthorizeUser>,
    new_authority: Pubkey,
    authority_type: AuthorityType,
  ) -> Result<()> {
    processor::authorize_user(ctx, new_authority, authority_type)
  }

  #[instruction(discriminator = [6])]
  pub fn authorize_intent(ctx: Context<AuthorizeIntent>) -> Result<()> {
    processor::authorize_intent(ctx)
  }

  #[instruction(discriminator = [7])]
  pub fn split(ctx: Context<Split>, lamports: u64) -> Result<()> {
    processor::split(ctx, lamports)
  }

  #[instruction(discriminator = [8])]
  pub fn merge(ctx: Context<Merge>) -> Result<()> {
    processor::merge(ctx)
  }

  #[instruction(discriminator = [9])]
  pub fn move_stake(ctx: Context<TransferAccounts>, lamports: u64) -> Result<()> {
    processor::move_stake(ctx, lamports)
  }

  #[instruction(discriminator = [10])]
  pub fn move_lamports(ctx: Context<TransferAccounts>, lamports: u64) -> Result<()> {
    processor::move_lamports(ctx, lamports)
  }
}
