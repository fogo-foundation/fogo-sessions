use crate::PROGRAM_SIGNER_SEED;
use solana_account_info::AccountInfo;
use solana_cpi::invoke_signed;
use solana_program_error::ProgramError;
use solana_pubkey::Pubkey;
use spl_token::instruction::transfer_checked;

pub fn in_session_token_transfer_checked<'a>(
    token_program: AccountInfo<'a>,
    source: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    session_key: AccountInfo<'a>,
    cpi_signer: AccountInfo<'a>,
    program_id: &Pubkey,
    bump: Option<u8>,
    amount: u64,
    decimals: u8,
) -> Result<(), ProgramError> {
    let mut instruction = transfer_checked(
        token_program.key,
        source.key,
        mint.key,
        destination.key,
        session_key.key,
        &[cpi_signer.key],
        amount,
        decimals,
    )?;
    instruction.accounts[3].is_signer = true;

    let bump = bump.unwrap_or(Pubkey::find_program_address(&[PROGRAM_SIGNER_SEED], program_id).1);

    invoke_signed(
        &instruction,
        &[source, mint, destination, session_key, cpi_signer],
        &[&[PROGRAM_SIGNER_SEED, &[bump]]],
    )
}
