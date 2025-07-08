use crate::PROGRAM_SIGNER_SEED;
use solana_account_info::AccountInfo;
use solana_cpi::invoke_signed;
use solana_program_error::ProgramError;
use solana_pubkey::Pubkey;
use spl_token::instruction::transfer_checked;

pub struct InSessionTokenTransferCheckedContext<'a> {
    pub source: AccountInfo<'a>,
    pub mint: AccountInfo<'a>,
    pub destination: AccountInfo<'a>,
    pub session_key: AccountInfo<'a>,
    pub cpi_signer: AccountInfo<'a>,
}

impl<'a> InSessionTokenTransferCheckedContext<'a> {
    pub fn to_account_infos(self) -> [AccountInfo<'a>; 5] {
        [
            self.source,
            self.mint,
            self.destination,
            self.session_key,
            self.cpi_signer,
        ]
    }
}

/// Transfering tokens in a session is similar to a regular token transfer, with the session key as the `authority`.
/// Additionally, the PDA with seed `PROGRAM_SIGNER_SEED` is required to sign the cross program invocation. This
/// is used to check that the transfer happened was invoked by an authorized program.
pub fn in_session_token_transfer_checked<'a>(
    token_program_id: &Pubkey,
    cpi_context: InSessionTokenTransferCheckedContext<'a>,
    program_id: &Pubkey,
    bump: Option<u8>,
    amount: u64,
    decimals: u8,
) -> Result<(), ProgramError> {
    let mut instruction = transfer_checked(
        token_program_id,
        cpi_context.source.key,
        cpi_context.mint.key,
        cpi_context.destination.key,
        cpi_context.session_key.key,
        &[cpi_context.cpi_signer.key],
        amount,
        decimals,
    )?;
    instruction.accounts[3].is_signer = true;

    let bump = bump.unwrap_or(Pubkey::find_program_address(&[PROGRAM_SIGNER_SEED], program_id).1);

    invoke_signed(
        &instruction,
        cpi_context.to_account_infos().as_slice(),
        &[&[PROGRAM_SIGNER_SEED, &[bump]]],
    )
}
