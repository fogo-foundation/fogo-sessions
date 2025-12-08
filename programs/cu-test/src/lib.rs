use fogo_sessions_sdk::session::Session;
use solana_program::{
    account_info::{AccountInfo, next_account_info}, clock::Clock, entrypoint::{self, ProgramResult}, msg, program_error::ProgramError, pubkey::Pubkey, sysvar::Sysvar
};

/// Define the type of state stored in accounts
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Counter {
    pub counter: u64,
}

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
    program_id: &Pubkey,
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
            .map_err(|err| {
                ic_msg!(invoke_context, "Session validation error occurred: {}", err,);
                InstructionError::IncorrectAuthority
            })?;
    
        // the user matches the funding account
        if &checked_user != from_account.get_key() {
            ic_msg!(
                invoke_context,
                "Session account user {} does not match source account {}",
                checked_user,
                from_account.get_key()
            );
            return Err(InstructionError::IncorrectAuthority);
        }
    
        // check to account which must be a Token ATA account for the given user
        let to_account_ata_owner = get_checked_ata_owner(to_account)?;
        if checked_user != to_account_ata_owner {
            ic_msg!(
                invoke_context,
                "Session account user {} does not own destination token account {}",
                checked_user,
                to_account_ata_owner,
            );
            return Err(InstructionError::InvalidAccountData);
        }
    
        // all checks passed, session authorizes the funding account
        Ok(())

    // 102 CU
    // compute_fn!("Get Account Info" => {
    //     let accounts_iter = &mut accounts.iter();
    //     account = next_account_info(accounts_iter)?;
    // });

    // // 103 CU
    // compute_fn!("Do a signer check" => {
    //     if !account.is_signer {
    //         panic!("Account {} must be a signer", account.is_signer);
    //     }
    // });

    // // 116 CU
    // compute_fn!("Owner Check " => {
    //     if account.owner != program_id {
    //         msg!("Greeted account does not have the correct program id");
    //         return Err(ProgramError::IncorrectProgramId);
    //     }
    // });

    // let mut greeting_account;

    // // 128 CU
    // compute_fn!("Load account data, increase and serialize " => {
    //     // Increment and store the number of times the account has been greeted
    //     greeting_account = Counter::try_from_slice(&account.data.borrow())?;
    //     greeting_account.counter += 1;
    //     greeting_account.serialize(&mut *account.data.borrow_mut())?;
    // });

    // // 645 CU
    // compute_fn!("Logging " => {
    //     msg!("Greeted {} time(s)!", greeting_account.counter);
    // });

    Ok(())
}