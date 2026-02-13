#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`
use crate::domain::Domain;
use crate::error::DomainRegistryError;
use crate::state::Config;
use crate::state::DomainProgram;
use crate::state::DomainRecordInner;
use crate::state::CONFIG_SEED;
use anchor_lang::prelude::*;
use fogo_sessions_sdk::token::PROGRAM_SIGNER_SEED;

pub mod domain;
pub mod error;
pub mod state;
pub mod system_program;

declare_id!("DomaLfEueNY6JrQSEFjuXeUDiohFmSrFeTNTPamS2yog");

#[program]
pub mod domain_registry {
    use super::*;

    pub fn initialize<'info>(ctx: Context<'_, '_, '_, 'info, Initialize<'info>>) -> Result<()> {
        ctx.accounts.config.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn update_authority<'info>(
        ctx: Context<'_, '_, '_, 'info, UpdateAuthority<'info>>,
        new_authority: Pubkey,
    ) -> Result<()> {
        ctx.accounts.config.authority = new_authority;
        Ok(())
    }

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
        ctx.accounts.create_domain_record_if_needed(&domain)?; // We are creating the PDA outside of Anchor because Anchor doesn't support the seed to be a non-trivial function of the instruction arguments

        let mut domain_record = DomainRecordInner::load(
            ctx.accounts.domain_record.to_account_info(),
            ctx.accounts.authority.to_account_info(),
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

    pub fn remove_program<'info>(
        ctx: Context<'_, '_, '_, 'info, RemoveProgram<'info>>,
        domain: String,
    ) -> Result<()> {
        let domain = Domain::new_checked(&domain)?;
        require_eq!(
            ctx.accounts.domain_record.key(),
            domain.get_domain_record_address(),
            DomainRegistryError::InvalidDomainRecordPda
        );
        let mut domain_record = DomainRecordInner::load(
            ctx.accounts.domain_record.to_account_info(),
            ctx.accounts.authority.to_account_info(),
        );
        let index_to_remove = domain_record
            .position(|program: &DomainProgram| {
                program.program_id == ctx.accounts.program_id.key()
            })?
            .ok_or(DomainRegistryError::ProgramNotFound)?;
        domain_record.swap_remove(index_to_remove)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + 32, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAuthority<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump, has_one = authority)]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
#[instruction(domain: String)]
pub struct AddProgram<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump, has_one = authority)]
    pub config: Account<'info, Config>,
    /// CHECK: We will do the checks in the function since Anchor isn't expressive enough
    #[account(mut)]
    pub domain_record: AccountInfo<'info>,
    /// CHECK: The only requirement for program_id is that it is a valid Pubkey
    pub program_id: AccountInfo<'info>,
    /// CHECK: We check the PDA derivation
    #[account(seeds = [PROGRAM_SIGNER_SEED], bump, seeds::program = program_id.key())]
    pub signer_pda: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(domain: String)]
pub struct RemoveProgram<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump, has_one = authority)]
    pub config: Account<'info, Config>,
    /// CHECK: We will do the checks in the function since Anchor isn't expressive enough
    #[account(mut)]
    pub domain_record: AccountInfo<'info>,
    /// CHECK: The only requirement for program_id is that it is a valid Pubkey
    pub program_id: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> AddProgram<'info> {
    fn create_domain_record_if_needed(&self, domain: &Domain) -> Result<()> {
        if self.domain_record.owner == &System::id() {
            system_program::create_pda(
                &self.authority,
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
