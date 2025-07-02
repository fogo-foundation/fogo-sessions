#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`
use crate::domain::Domain;
use crate::error::DomainRegistryError;
use crate::state::DomainProgram;
use crate::state::DomainRecordInner;
use anchor_lang::prelude::*;
use fogo_sessions_sdk::PROGRAM_SIGNER_SEED;

pub mod domain;
pub mod error;
pub mod state;
pub mod system_program;

declare_id!("6pubKDUKpUdJSVxNKpnMrG52vdBVbB1duXoUcNpAHzu5");

#[program]
pub mod domain_registry {
    use super::*;
    pub fn add_program<'info>(
        ctx: Context<'_, '_, '_, 'info, AddProgram<'info>>,
        domain: String,
    ) -> Result<()> {
        let domain = Domain::new_checked(&domain)?;
        require_eq!(
            ctx.accounts.domain_record.key(),
            domain.get_domain_record_address(),
            DomainRegistryError::InvalidDomainRecordPda
        );
        ctx.accounts.create_domain_record_if_needed(&domain)?;

        let mut domain_record = DomainRecordInner::load(
            ctx.accounts.domain_record.to_account_info(),
            ctx.accounts.sponsor.to_account_info(),
        );
        let domain_program = DomainProgram {
            program_id: ctx.accounts.program_id.key(),
            signer_pda: ctx.accounts.signer_pda.key(),
        };
        if domain_record.contains(domain_program)? {
            return Err(DomainRegistryError::ProgramAlreadyAdded.into());
        }
        domain_record.push(domain_program)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(domain: String)]
pub struct AddProgram<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,
    /// CHECK: We will do the checks in the function since Anchor isn't expressive enough
    #[account(mut)]
    pub domain_record: AccountInfo<'info>,
    /// CHECK: We just check that this is an actual program by checking the executable flag
    #[account(executable)]
    pub program_id: AccountInfo<'info>,
    /// CHECK: We check the PDA derivation
    #[account(seeds = [PROGRAM_SIGNER_SEED], bump, seeds::program = program_id.key())]
    pub signer_pda: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> AddProgram<'info> {
    fn create_domain_record_if_needed(&self, domain: &Domain) -> Result<()> {
        if self.domain_record.data_is_empty() {
            system_program::create_pda(
                &self.sponsor,
                &self.domain_record,
                &self.system_program,
                &ID,
                &Rent::get()?,
                0,
                domain.get_seeds(),
            )?;
        }
        Ok(())
    }
}
