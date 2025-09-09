#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`
#![allow(deprecated)] // warning: use of deprecated method `anchor_lang::prelude::AccountInfo::<'a>::realloc`: Use AccountInfo::resize() instead

use crate::intents::body::MessageBody;
use crate::intents::body::Tokens;
use crate::intents::body::Version;
use crate::intents::ed25519::Intent;
use anchor_lang::solana_program::borsh0_10::get_instance_packed_len;
use anchor_lang::{prelude::*, solana_program::sysvar::instructions};
use anchor_spl::token::Token;
use fogo_sessions_sdk::session::AuthorizedPrograms;
use fogo_sessions_sdk::session::AuthorizedTokens;
use fogo_sessions_sdk::session::Session;
use fogo_sessions_sdk::session::SessionInfo;
use crate::error::SessionManagerError;

declare_id!("SesswvJ7puvAgpyqp7N8HnjNnvpnS8447tKNF3sPgbC");

pub mod error;
pub mod intents;
pub mod system_program;

const SESSION_SETTER_SEED: &[u8] = b"session_setter";

#[program]
pub mod session_manager {
    use fogo_sessions_sdk::session::{ActiveSessionInfo, V2};

    use super::*;

    #[instruction(discriminator = [0])]
    pub fn start_session<'info>(
        ctx: Context<'_, '_, '_, 'info, StartSession<'info>>,
    ) -> Result<()> {
        let Intent { signer, message } = ctx.accounts.verify_intent()?;
        let MessageBody {
            chain_id,
            domain,
            session_key,
            expires,
            extra,
            tokens,
            version,
        } = message.parse()?;
        let Version { major, minor } = version;
        ctx.accounts.check_chain_id(chain_id)?;
        ctx.accounts.check_session_key(session_key)?;

        let authorized_tokens = match tokens {
            Tokens::Specific(tokens) => {
                ctx.accounts.approve_tokens(
                    ctx.remaining_accounts,
                    &tokens,
                    &signer,
                    ctx.bumps.session_setter,
                )?;
                AuthorizedTokens::Specific
            }
            Tokens::All => AuthorizedTokens::All,
        };

        let program_domains = ctx.accounts.get_domain_programs(domain)?;

        let session = match minor {
            1 => Session {
                sponsor: ctx.accounts.sponsor.key(),
                major,
                session_info: SessionInfo::V1(ActiveSessionInfo {
                    user: signer,
                    authorized_programs: AuthorizedPrograms::Specific(program_domains),
                    authorized_tokens,
                    extra: extra.into(),
                    expiration: expires.timestamp(),
                }),
            },
            2 => Session {
                sponsor: ctx.accounts.sponsor.key(),
                major,
                session_info: SessionInfo::V2(V2::Active(ActiveSessionInfo {
                    user: signer,
                    authorized_programs: AuthorizedPrograms::Specific(program_domains),
                    authorized_tokens,
                    extra: extra.into(),
                    expiration: expires.timestamp(),
                })),
            },
            _ => return err!(SessionManagerError::InvalidVersion),
        };
        ctx.accounts.initialize_and_store_session(&session)?;
        Ok(())
    }

    #[instruction(discriminator = [1])]
    pub fn revoke_session<'info>(
        ctx: Context<'_, '_, '_, 'info, RevokeSession<'info>>,
    ) -> Result<()> {
        assert_eq!(ctx.accounts.session.sponsor, ctx.accounts.sponsor.key());
        match &ctx.accounts.session.session_info {
            SessionInfo::Invalid => return err!(SessionManagerError::InvalidVersion),
            SessionInfo::V1(_) => return err!(SessionManagerError::InvalidVersion),
            SessionInfo::V2(V2::Active(active_session_info)) => {
                ctx.accounts.session.session_info = SessionInfo::V2(V2::Revoked(active_session_info.expiration));
            }
            SessionInfo::V2(V2::Revoked(_)) => {}, // Idempotent
        }

        let new_len = 8 + get_instance_packed_len::<Session>(&ctx.accounts.session)?;
        ctx.accounts.session.to_account_info().realloc(new_len, false)?;

        let new_rent = Rent::get()?.minimum_balance(new_len as usize);
        let current_rent = ctx.accounts.session.to_account_info().lamports();

        if new_rent < current_rent {
            **ctx.accounts.session.to_account_info().try_borrow_mut_lamports()? = new_rent;
            **ctx.accounts.sponsor.try_borrow_mut_lamports()? += current_rent.saturating_sub(new_rent);
        }
        Ok(())
    }

    /// This is just to trick anchor into generating the IDL for the Session account since we don't use it in the context for `start_session`
    #[instruction(discriminator = [2])]
    pub fn _unused<'info>(_ctx: Context<'_, '_, '_, 'info, Unused<'info>>) -> Result<()> {
        err!(ErrorCode::InstructionDidNotDeserialize)
    }
}

#[derive(Accounts)]
pub struct StartSession<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,
    #[account(seeds = [chain_id::SEED], seeds::program = chain_id::ID, bump)]
    pub chain_id: Account<'info, chain_id::ChainId>,
    #[account(mut)]
    pub session: Signer<'info>,
    /// CHECK: we check the address of this account
    #[account(address = instructions::ID)]
    pub sysvar_instructions: AccountInfo<'info>,
    /// CHECK: We will do the checks in the function in `get_domain_programs`
    pub domain_registry: AccountInfo<'info>,
    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [SESSION_SETTER_SEED], bump)]
    pub session_setter: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeSession<'info> {
    #[account(mut, signer)]
    pub session: Account<'info, Session>,
    /// CHECK: we will check against the session's sponsor
    pub sponsor: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Unused<'info> {
    pub session: Account<'info, Session>,
}

impl<'info> StartSession<'info> {
    pub fn initialize_and_store_session(&self, session: &Session) -> Result<()> {
        system_program::initialize_account(
            &self.sponsor,
            &self.session,
            &self.system_program,
            &crate::ID,
            &Rent::get()?,
            8 + get_instance_packed_len(&session)? as u64,
        )?;

        let mut data = self.session.try_borrow_mut_data()?;
        let dst: &mut [u8] = &mut data;
        let mut writer = anchor_lang::__private::BpfWriter::new(dst); // This is the writer that Anchor uses internally
        session.try_serialize(&mut writer)?;

        Ok(())
    }
}


#[cfg(test)]
mod tests {
    use fogo_sessions_sdk::session::token_program::SESSION_SETTER;

    use super::*;

    #[test]
    fn test_program_id_matches_sdk() {
        assert_eq!(ID, fogo_sessions_sdk::session::SESSION_MANAGER_ID);
    }

    #[test]
    fn test_session_setter_pda_derivation() {
        assert_eq!(
            SESSION_SETTER,
            Pubkey::find_program_address(&[SESSION_SETTER_SEED], &ID).0
        );
    }
}
