pub mod authorize_user;
pub use authorize_user::*;

pub mod authorize_intent;
pub use authorize_intent::*;

pub mod delegate;
pub use delegate::*;

pub mod deactivate;
pub use deactivate::*;

pub mod deposit;
pub use deposit::*;

pub mod initialize;
pub use initialize::*;

pub mod stake_transfers;
pub use stake_transfers::*;

pub mod withdraw;
pub use withdraw::*;

use anchor_lang::prelude::*;

pub use crate::anchor_types::StakeAccount;

pub const AUTHORITY_SEED: &[u8] = b"authority";

pub fn get_authority_pda_and_bump(user: &Pubkey) -> Result<(Pubkey, u8)> {
  Ok(Pubkey::find_program_address(&[AUTHORITY_SEED, user.as_ref()], &crate::ID))
}

pub fn extract_user_and_authority<'info>(
  signer_or_session: &anchor_lang::prelude::Signer<'info>,
) -> Result<(Pubkey, Pubkey, u8)> {
  use fogo_sessions_sdk::session::Session;

  let user = Session::extract_user_from_signer_or_session(&signer_or_session.to_account_info(), &crate::ID)
    .map_err(anchor_lang::prelude::ProgramError::from)?;

  let (authority_key, authority_bump) = get_authority_pda_and_bump(&user)?;

  Ok((user, authority_key, authority_bump))
}

pub fn invoke_stake_program_with_seeds<'info>(
  instruction: &anchor_lang::solana_program::instruction::Instruction,
  accounts: &[anchor_lang::prelude::AccountInfo<'info>],
  user: &Pubkey,
  authority_bump: u8,
) -> Result<()> {
  anchor_lang::solana_program::program::invoke_signed(
    instruction,
    accounts,
    &[&[AUTHORITY_SEED, user.as_ref(), &[authority_bump]]],
  )?;

  Ok(())
}

pub fn invoke_stake_program<'info>(
  instruction: &anchor_lang::solana_program::instruction::Instruction,
  accounts: &[anchor_lang::prelude::AccountInfo<'info>],
  signer_or_session: &anchor_lang::prelude::Signer<'info>,
) -> Result<()> {
  let (user, _authority_key, authority_bump) = extract_user_and_authority(signer_or_session)?;
  invoke_stake_program_with_seeds(instruction, accounts, &user, authority_bump)
}

pub fn prepare_stake_account<'info>(
  stake_account: &AccountInfo<'info>,
  payer: &Signer<'info>,
) -> Result<()> {
  use anchor_lang::solana_program::program::invoke;
  use solana_system_interface::instruction as system_instruction;
  use solana_stake_interface::state::StakeStateV2;

  let stake_key = stake_account.key();

  // Ensure rent exemption
  let rent_exemption = Rent::get()?.minimum_balance(StakeStateV2::size_of());
  let lamports_needed = rent_exemption.saturating_sub(stake_account.lamports());

  if lamports_needed > 0 {
    invoke(
      &system_instruction::transfer(
        &payer.key(),
        &stake_key,
        lamports_needed,
      ),
      &[payer.to_account_info(), stake_account.clone()],
    )?;
  }

  invoke(
    &system_instruction::allocate(&stake_key, StakeStateV2::size_of() as u64),
    &[stake_account.clone()],
  )?;

  invoke(
    &system_instruction::assign(&stake_key, &solana_stake_interface::program::ID),
    &[stake_account.clone()],
  )?;

  Ok(())
}
