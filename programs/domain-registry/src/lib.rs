#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`
use crate::error::DomainRegistryError;
use crate::state::DomainRecordInner;
use anchor_lang::{prelude::*, solana_program::hash::hashv};
use fogo_sessions_sdk::AuthorizedProgram;
use fogo_sessions_sdk::PROGRAM_SIGNER_SEED;

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
            DomainRegistryError::InvalidDomainRecordAddress
        );
        ctx.accounts.create_domain_record_if_needed(&domain)?;

        let mut domain_record = DomainRecordInner::load(
            ctx.accounts.domain_record.to_account_info(),
            ctx.accounts.sponsor.to_account_info(),
        );
        let authorized_program = AuthorizedProgram {
            program_id: ctx.accounts.program_id.key(),
            signer_pda: ctx.accounts.signer_pda.key(),
        };
        if domain_record.contains(authorized_program)? {
            return Err(DomainRegistryError::ProgramAlreadyAdded.into());
        }
        domain_record.push(AuthorizedProgram {
            program_id: ctx.accounts.program_id.key(),
            signer_pda: ctx.accounts.signer_pda.key(),
        })?;
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug)]
pub struct Domain(String);

impl Domain {
    pub fn new_checked(domain: &str) -> Result<Self> {
        // TO DO
        Ok(Self(domain.to_string()))
    }

    fn get_seeds(&self) -> Vec<Vec<u8>> {
        let hash = hashv(&[self.0.as_bytes()]);
        let seeds = [b"domain-record", hash.as_ref()];
        let bump = Pubkey::find_program_address(&seeds, &ID).1;
        let mut result = vec![];
        result.extend(seeds.iter().map(|seed| seed.to_vec()));
        result.push(vec![bump]);
        result
    }

    pub fn get_domain_record_address(&self) -> Pubkey {
        let seeds = self.get_seeds();
        Pubkey::create_program_address(
            seeds
                .iter()
                .map(|seed| seed.as_slice())
                .collect::<Vec<&[u8]>>()
                .as_slice(),
            &ID,
        )
        .expect("We pre-computed the bump")
    }
}
#[derive(Accounts)]
#[instruction(domain: String)]
pub struct AddProgram<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,
    /// CHECK: We will do the checks in the function
    #[account(mut)]
    pub domain_record: AccountInfo<'info>,
    /// CHECK: This account is just an arg, we don't access the data
    #[account(executable)]
    pub program_id: AccountInfo<'info>,
    /// CHECK: This account is just an arg, we don't access the data
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
