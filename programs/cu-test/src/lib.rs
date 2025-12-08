use fogo_sessions_sdk::session::Session;
use solana_program::{
    account_info::{AccountInfo, next_account_info}, clock::Clock, entrypoint::ProgramResult, msg, program_error::ProgramError, pubkey::Pubkey, sysvar::Sysvar
};
use solana_program::entrypoint::entrypoint;
use spl_associated_token_account::get_associated_token_address;

#[macro_export]
macro_rules! compute_fn {
    ($msg:expr=> $($tt:tt)*) => {
        ::solana_program::msg!(concat!($msg, " {"));
        ::solana_program::log::sol_log_compute_units();
        let res = { $($tt)* };
        ::solana_program::log::sol_log_compute_units();
        ::solana_program::msg!(concat!(" } // ", $msg));
        res
    };
}

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Empty 240 CU
// Without Logging 296 CU
// With Logging count 841 CU
// With tracking 2,886 CU
pub fn process_instruction(
    _: &Pubkey,
    accounts: &[AccountInfo], // Only contains the counter account
    _instruction_data: &[u8], // Only one instruction so we can ignore the rest
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let session_account = next_account_info(accounts_iter)?;
    let from_account = next_account_info(accounts_iter)?;
    let to_account = next_account_info(accounts_iter)?;

    // check to see if session account is owned by the session manager
    if session_account.owner != &fogo_sessions_sdk::session::SESSION_MANAGER_ID {
        return Err(ProgramError::InvalidAccountData);
    }

    // parse session from account
    let session_data = Session::try_deserialize(&mut session_account.data.borrow().as_ref()).map_err(|_| {
        ProgramError::InvalidAccountData
    })?;

    let clock = Clock::get()?;

    // checks: session liveness, revocation, and program, returning the user
    let checked_user = session_data
        .get_user_checked_system_program(&clock)
        .map_err(|_| {
            ProgramError::IncorrectAuthority
        })?;

    // the user matches the funding account
    if &checked_user != from_account.key {
        return Err(ProgramError::IncorrectAuthority);
    }

    // check to account which must be a Token ATA account for the given user
    let expected_to_account =  get_associated_token_address_and_bump_seed_internal(from_account.key, &spl_token::native_mint::ID, &spl_associated_token_account::ID, &spl_token::ID);
    msg!("the bump was: {}", expected_to_account.1);
    if expected_to_account.0 != *to_account.key {
        return Err(ProgramError::InvalidAccountData);
    }

    Ok(())
}

pub fn get_associated_token_address_and_bump_seed_internal(
    wallet_address: &Pubkey,
    token_mint_address: &Pubkey,
    program_id: &Pubkey,
    token_program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            &wallet_address.to_bytes(),
            &token_program_id.to_bytes(),
            &token_mint_address.to_bytes(),
        ],
        program_id,
    )
}