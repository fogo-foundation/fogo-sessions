use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
};

const SPL_TOKEN_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

fn check_program_account(spl_token_program_id: &Pubkey) -> Result<(), ProgramError> {
    if spl_token_program_id != &SPL_TOKEN_PROGRAM_ID {
        return Err(ProgramError::IncorrectProgramId);
    }
    Ok(())
}

/// This function is meant to replace `spl_token::instruction::transfer` in the context of sessions.
/// In-session token transfers are different from regular transfers in that they not only require the session key to sign as the authority, but also require an additional signer.
/// This additional signer is the `program_signer` and allows the token program to verify that the transfer is happening within an authorized program. It is the PDA of the authorized program that will call the instruction via CPI with seed `PROGRAM_SIGNER_SEED`.
/// This function has also been designed to allow non-sessions transfers by setting the `program_signer` to `None`.
pub fn transfer(
    token_program_id: &Pubkey,
    source_pubkey: &Pubkey,
    destination_pubkey: &Pubkey,
    authority_pubkey: &Pubkey,
    program_signer: Option<&Pubkey>,
    amount: u64,
) -> Result<Instruction, ProgramError> {
    check_program_account(token_program_id)?;

    let mut accounts = vec![
        AccountMeta::new(*source_pubkey, false),
        AccountMeta::new(*destination_pubkey, false),
        AccountMeta::new_readonly(*authority_pubkey, true),
    ];

    if let Some(program_signer) = program_signer {
        accounts.push(AccountMeta::new_readonly(*program_signer, true));
    }

    let mut data = Vec::with_capacity(5);
    data.push(3);
    data.extend_from_slice(&amount.to_le_bytes());

    Ok(Instruction {
        program_id: *token_program_id,
        accounts,
        data,
    })
}

/// This function is meant to replace `spl_token::instruction::transfer_checked` in the context of sessions.
/// In-session token transfers are different from regular transfers in that they not only require the session key to sign as the authority, but also require an additional signer.
/// This additional signer is the `program_signer` and allows the token program to verify that the transfer is happening within an authorized program. It is the PDA of the authorized program that will call the instruction via CPI with seed `PROGRAM_SIGNER_SEED`.
/// This function has also been designed to allow non-sessions transfers by setting the `program_signer` to `None`.
#[allow(clippy::too_many_arguments)]
pub fn transfer_checked(
    token_program_id: &Pubkey,
    source_pubkey: &Pubkey,
    mint_pubkey: &Pubkey,
    destination_pubkey: &Pubkey,
    authority_pubkey: &Pubkey,
    program_signer: Option<&Pubkey>,
    amount: u64,
    decimals: u8,
) -> Result<Instruction, ProgramError> {
    check_program_account(token_program_id)?;

    let mut accounts = vec![
        AccountMeta::new(*source_pubkey, false),
        AccountMeta::new_readonly(*mint_pubkey, false),
        AccountMeta::new(*destination_pubkey, false),
        AccountMeta::new_readonly(*authority_pubkey, true),
    ];

    if let Some(program_signer) = program_signer {
        accounts.push(AccountMeta::new_readonly(*program_signer, true));
    }

    let mut data = Vec::with_capacity(6);
    data.push(12);
    data.extend_from_slice(&amount.to_le_bytes());
    data.push(decimals);

    Ok(Instruction {
        program_id: *token_program_id,
        accounts,
        data,
    })
}

/// This function is meant to replace `spl_token::instruction::burn` in the context of sessions.
/// In-session token burns are different from regular burns in that they not only require the session key to sign as the authority, but also require an additional signer.
/// This additional signer is the `program_signer` and allows the token program to verify that the burn is happening within an authorized program. It is the PDA of the authorized program that will call the instruction via CPI with seed `PROGRAM_SIGNER_SEED`.
/// This function has also been designed to allow non-sessions burns by setting the `program_signer` to `None`.
pub fn burn(
    token_program_id: &Pubkey,
    account_pubkey: &Pubkey,
    mint_pubkey: &Pubkey,
    authority_pubkey: &Pubkey,
    program_signer: Option<&Pubkey>,
    amount: u64,
) -> Result<Instruction, ProgramError> {
    check_program_account(token_program_id)?;

    let mut data = Vec::with_capacity(5);
    data.push(8);
    data.extend_from_slice(&amount.to_le_bytes());

    let mut accounts = vec![
        AccountMeta::new(*account_pubkey, false),
        AccountMeta::new(*mint_pubkey, false),
        AccountMeta::new_readonly(*authority_pubkey, true),
    ];

    if let Some(program_signer) = program_signer {
        accounts.push(AccountMeta::new_readonly(*program_signer, true));
    }

    Ok(Instruction {
        program_id: *token_program_id,
        accounts,
        data,
    })
}

/// This function is meant to replace `spl_token::instruction::burn_checked` in the context of sessions.
/// In-session token burns are different from regular burns in that they not only require the session key to sign as the authority, but also require an additional signer.
/// This additional signer is the `program_signer` and allows the token program to verify that the transfer is happening within an authorized program. It is the PDA of the authorized program that will call the instruction via CPI with seed `PROGRAM_SIGNER_SEED`.
/// This function has also been designed to allow non-sessions burns by setting the `program_signer` to `None`.
pub fn burn_checked(
    token_program_id: &Pubkey,
    account_pubkey: &Pubkey,
    mint_pubkey: &Pubkey,
    authority_pubkey: &Pubkey,
    program_signer: Option<&Pubkey>,
    amount: u64,
    decimals: u8,
) -> Result<Instruction, ProgramError> {
    check_program_account(token_program_id)?;

    let mut data = Vec::with_capacity(6);
    data.push(15);
    data.extend_from_slice(&amount.to_le_bytes());
    data.push(decimals);

    let mut accounts = vec![
        AccountMeta::new(*account_pubkey, false),
        AccountMeta::new(*mint_pubkey, false),
        AccountMeta::new_readonly(*authority_pubkey, true),
    ];

    if let Some(program_signer) = program_signer {
        accounts.push(AccountMeta::new_readonly(*program_signer, true));
    }

    Ok(Instruction {
        program_id: *token_program_id,
        accounts,
        data,
    })
}
