use anchor_lang::prelude::*;
use anchor_lang::solana_program::bpf_loader_upgradeable;

use crate::error::IntentTransferError;

#[derive(Accounts)]
pub struct UpgradeAuthority<'info> {
    #[account(mut, address = program_data.upgrade_authority_address.ok_or(IntentTransferError::Unauthorized)?)]
    pub signer: Signer<'info>,

    #[account(seeds = [crate::ID.as_ref()], bump, seeds::program = bpf_loader_upgradeable::ID)]
    pub program_data: Account<'info, ProgramData>,
}
