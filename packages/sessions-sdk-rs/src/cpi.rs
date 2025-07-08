use crate::PROGRAM_SIGNER_SEED;
use solana_account_info::AccountInfo;
use solana_cpi::invoke_signed;
use solana_program_error::ProgramError;
use solana_pubkey::Pubkey;
use spl_token::instruction::transfer_checked;

/// Transfering tokens in a session is similar to a regular token transfer, with the session key as the `authority`.
/// Additionally, the PDA with seed `PROGRAM_SIGNER_SEED` is required to sign the cross program invocation. This
/// is used to check that the transfer happened was invoked by an authorized program.
pub fn in_session_token_transfer_checked<'a>(
    token_program_id: &Pubkey,
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
        token_program_id,
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
