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

pub fn transfer(
    token_program_id: &Pubkey,
    source_pubkey: &Pubkey,
    destination_pubkey: &Pubkey,
    session_key: &Pubkey,
    cpi_signer: &Pubkey,
    amount: u64,
) -> Result<Instruction, ProgramError> {
    check_program_account(token_program_id)?;

    let accounts = vec![
        AccountMeta::new(*source_pubkey, false),
        AccountMeta::new(*destination_pubkey, false),
        AccountMeta::new_readonly(*session_key, true),
        AccountMeta::new_readonly(*cpi_signer, true),
    ];

    let mut data = Vec::with_capacity(8);
    data.push(3);
    data.extend_from_slice(&amount.to_le_bytes());

    Ok(Instruction {
        program_id: *token_program_id,
        accounts,
        data,
    })
}

#[allow(clippy::too_many_arguments)]
pub fn transfer_checked(
    token_program_id: &Pubkey,
    source_pubkey: &Pubkey,
    mint_pubkey: &Pubkey,
    destination_pubkey: &Pubkey,
    session_key: &Pubkey,
    cpi_signer: &Pubkey,
    amount: u64,
    decimals: u8,
) -> Result<Instruction, ProgramError> {
    check_program_account(token_program_id)?;

    let accounts = vec![
        AccountMeta::new(*source_pubkey, false),
        AccountMeta::new_readonly(*mint_pubkey, false),
        AccountMeta::new(*destination_pubkey, false),
        AccountMeta::new_readonly(*session_key, true),
        AccountMeta::new_readonly(*cpi_signer, true),
    ];

    let mut data = Vec::with_capacity(8);
    data.push(12);
    data.extend_from_slice(&amount.to_le_bytes());
    data.push(decimals);

    Ok(Instruction {
        program_id: *token_program_id,
        accounts,
        data,
    })
}
