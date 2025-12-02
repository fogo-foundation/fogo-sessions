#![allow(unexpected_cfgs)]

use anchor_lang::solana_program::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, msg,
    program_error::ProgramError, pubkey::Pubkey,
};

#[cfg(not(feature = "no-entrypoint"))]
entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Mock NTT With Executor called");

    let discriminator = &instruction_data[0..8];

    match discriminator {
        // relay_ntt_message discriminator
        [192, 85, 112, 237, 55, 33, 49, 150] => {
            msg!("Mock: relay_ntt_message instruction");
        }
        _ => {
            return Err(ProgramError::InvalidInstructionData);
        }
    }

    msg!("Mock NTT With Executor execution complete");
    Ok(())
}
