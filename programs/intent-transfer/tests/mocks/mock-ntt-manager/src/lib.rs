#![allow(unexpected_cfgs)]

use anchor_lang::solana_program::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, msg,
    program_error::ProgramError, pubkey::Pubkey, program_pack::Pack,
    keccak::hashv, program::invoke_signed,
};

#[cfg(not(feature = "no-entrypoint"))]
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Mock NTT Manager called");

    if instruction_data.len() < 8 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let discriminator = &instruction_data[0..8];

    match discriminator {
            // transfer_burn discriminator
            [75, 144, 26, 232, 39, 12, 75, 222] => {
                msg!("Mock: transfer_burn instruction");

                let mint_account = &accounts[2];
                let from_account = &accounts[3];
                let token_program = &accounts[4];
                let custody_account = &accounts[7];
                let session_authority = &accounts[11];

                let amount = u64::from_le_bytes([
                    instruction_data[8], instruction_data[9], instruction_data[10], instruction_data[11],
                    instruction_data[12], instruction_data[13], instruction_data[14], instruction_data[15],
                ]);

                let decimals = {
                    let mint_data = mint_account.try_borrow_data()?;
                    let mint = spl_token::state::Mint::unpack(&mint_data)?;
                    mint.decimals
                };

                let from_owner = {
                    let from_data = from_account.try_borrow_data()?;
                    let from_token = spl_token::state::Account::unpack(&from_data)?;
                    from_token.owner
                };

                let recipient_chain = u16::from_le_bytes([instruction_data[16], instruction_data[17]]);
                let mut recipient_address = [0u8; 32];
                recipient_address.copy_from_slice(&instruction_data[18..50]);
                let should_queue = instruction_data[50] != 0;

                // Compute keccak256 of the args (same as TransferArgs::keccak256() in the real program)
                let args_hash = hashv(&[
                    &amount.to_be_bytes(),
                    &recipient_chain.to_be_bytes(),
                    &recipient_address,
                    &[u8::from(should_queue)],
                ]);

                let session_authority_seed = b"session_authority";
                let (_, bump) = Pubkey::find_program_address(
                    &[
                        session_authority_seed,
                        from_owner.as_ref(),
                        args_hash.as_ref(),
                    ],
                    program_id,
                );

                // Perform token transfer using session_authority with PDA signing
                let transfer_ix = spl_token::instruction::transfer_checked(
                    token_program.key,
                    from_account.key,
                    mint_account.key,
                    custody_account.key,
                    session_authority.key,
                    &[],
                    amount,
                    decimals,
                )?;

                invoke_signed(
                    &transfer_ix,
                    &[
                        from_account.clone(),
                        mint_account.clone(),
                        custody_account.clone(),
                        session_authority.clone(),
                        token_program.clone(),
                    ],
                    &[&[
                        session_authority_seed,
                        from_owner.as_ref(),
                        args_hash.as_ref(),
                        &[bump],
                    ]],
                )?;
            }
            // release_wormhole_outbound discriminator
            [202, 87, 51, 173, 142, 160, 188, 204] => {
                msg!("Mock: release_wormhole_outbound instruction");
            }
            _ => {
                return Err(ProgramError::InvalidInstructionData);
            }
        }

    msg!("Mock NTT Manager execution complete");
    Ok(())
}
