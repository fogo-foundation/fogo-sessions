#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`
#![allow(deprecated)] // warning: use of deprecated method `anchor_lang::prelude::AccountInfo::<'a>::realloc`: Use AccountInfo::resize() instead

use crate::error::SessionManagerError;
use crate::message::{Message, Tokens};
use crate::token::approve::convert_remaning_accounts_and_token_limits_to_pending_approvals;
use crate::token::revoke::convert_remaining_accounts_and_mints_to_revoke_to_pending_revocations;
use anchor_lang::solana_program::borsh0_10::get_instance_packed_len;
use anchor_lang::{prelude::*, solana_program::sysvar::instructions};
use anchor_spl::token::Token;
use domain_registry::{domain::Domain, state::DomainRecordInner};
use fogo_sessions_sdk::session::{
    ActiveSessionInfo, AuthorizedProgram, AuthorizedPrograms, AuthorizedTokens,
    AuthorizedTokensWithMints, RevokedSessionInfo, Session, SessionInfo, V2, V3, V4,
};
use solana_intents::Intent;
use solana_intents::Version;

declare_id!("SesswvJ7puvAgpyqp7N8HnjNnvpnS8447tKNF3sPgbC");

mod clock;
pub mod error;
mod message;
mod system_program;
mod token;

const SESSION_SETTER_SEED: &[u8] = b"session_setter";

#[program]
pub mod session_manager {
    use fogo_sessions_sdk::session::ActiveSessionInfoWithDomainId;

    use super::*;

    #[instruction(discriminator = [0])]
    pub fn start_session<'info>(
        ctx: Context<'_, '_, '_, 'info, StartSession<'info>>,
    ) -> Result<()> {
        let Intent {
            signer,
            message:
                Message {
                    version: Version { major, minor },
                    chain_id,
                    domain,
                    expires,
                    session_key,
                    tokens,
                    extra,
                },
        } = Intent::load(&ctx.accounts.sysvar_instructions)
            .map_err(Into::<SessionManagerError>::into)?;
        ctx.accounts.check_chain_id(chain_id)?;
        ctx.accounts.check_session_key(session_key)?;

        let expiration = clock::check_expiration(expires)?;

        let authorized_tokens_with_mints = match tokens {
            Tokens::Specific(tokens) => {
                let pending_approvals =
                    convert_remaning_accounts_and_token_limits_to_pending_approvals(
                        ctx.remaining_accounts,
                        tokens,
                        &signer,
                    )?;
                let authorized_tokens_with_mints = AuthorizedTokensWithMints::Specific(
                    pending_approvals.iter().map(|p| p.mint()).collect(),
                );
                ctx.accounts
                    .approve_tokens(pending_approvals, ctx.bumps.session_setter)?;
                authorized_tokens_with_mints
            }
            Tokens::All => AuthorizedTokensWithMints::All,
        };

        let program_domains = ctx.accounts.get_domain_programs(&domain)?;

        let session = match minor {
            1 => Session {
                sponsor: ctx.accounts.sponsor.key(),
                major,
                session_info: SessionInfo::V1(ActiveSessionInfo {
                    user: signer,
                    authorized_programs: AuthorizedPrograms::Specific(program_domains),
                    authorized_tokens: authorized_tokens_with_mints.as_ref().clone(),
                    extra: extra.into(),
                    expiration,
                }),
            },
            2 => Session {
                sponsor: ctx.accounts.sponsor.key(),
                major,
                session_info: SessionInfo::V2(V2::Active(ActiveSessionInfo {
                    user: signer,
                    authorized_programs: AuthorizedPrograms::Specific(program_domains),
                    authorized_tokens: authorized_tokens_with_mints.as_ref().clone(),
                    extra: extra.into(),
                    expiration,
                })),
            },
            3 => Session {
                sponsor: ctx.accounts.sponsor.key(),
                major,
                session_info: SessionInfo::V3(V3::Active(ActiveSessionInfo {
                    user: signer,
                    authorized_programs: AuthorizedPrograms::Specific(program_domains),
                    authorized_tokens: authorized_tokens_with_mints,
                    extra: extra.into(),
                    expiration,
                })),
            },
            4 => Session {
                sponsor: ctx.accounts.sponsor.key(),
                major,
                session_info: SessionInfo::V4(V4::Active(ActiveSessionInfoWithDomainId {
                    domain_id: domain.get_domain_id().into(),
                    active_session_info: ActiveSessionInfo {
                        user: signer,
                        authorized_programs: AuthorizedPrograms::Specific(program_domains),
                        authorized_tokens: authorized_tokens_with_mints,
                        extra: extra.into(),
                        expiration,
                    },
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
        match &ctx.accounts.session.session_info {
            SessionInfo::Invalid => return err!(SessionManagerError::InvalidVersion),
            SessionInfo::V1(_) => return err!(SessionManagerError::InvalidVersion),
            SessionInfo::V2(V2::Active(active_session_info)) => {
                ctx.accounts.session.session_info =
                    SessionInfo::V2(V2::Revoked(active_session_info.expiration));
            }
            SessionInfo::V2(V2::Revoked(_)) => {} // Idempotent
            SessionInfo::V3(V3::Active(active_session_info)) => {
                ctx.accounts.session.session_info =
                    SessionInfo::V3(V3::Revoked(RevokedSessionInfo {
                        user: active_session_info.user,
                        expiration: active_session_info.expiration,
                        authorized_tokens_with_mints: active_session_info.authorized_tokens.clone(),
                    }));
            }
            SessionInfo::V3(V3::Revoked(_)) => {} // Idempotent
            SessionInfo::V4(V4::Active(active_session_info)) => {
                ctx.accounts.session.session_info =
                    SessionInfo::V4(V4::Revoked(RevokedSessionInfo {
                        user: active_session_info.as_ref().user,
                        expiration: active_session_info.as_ref().expiration,
                        authorized_tokens_with_mints: active_session_info
                            .as_ref()
                            .authorized_tokens
                            .clone(),
                    }));
            }
            SessionInfo::V4(V4::Revoked(_)) => {} // Idempotent
        }
        ctx.accounts.reallocate_and_refund_rent()?;
        Ok(())
    }

    #[instruction(discriminator = [2])]
    pub fn close_session<'info>(
        ctx: Context<'_, '_, '_, 'info, CloseSession<'info>>,
    ) -> Result<()> {
        let (user, mints_to_revoke) = match &ctx.accounts.session.session_info {
            // V3 sessions can be all be closed
            SessionInfo::V3(V3::Active(ActiveSessionInfo {
                authorized_tokens: authorized_tokens_with_mints,
                user,
                ..
            }))
            | SessionInfo::V3(V3::Revoked(RevokedSessionInfo {
                authorized_tokens_with_mints,
                user,
                ..
            })) => match &authorized_tokens_with_mints {
                AuthorizedTokensWithMints::Specific(mints) => (user, mints),
                AuthorizedTokensWithMints::All => (user, &vec![]),
            },
            // V2 and V1 sessions can only be closed if they don't have token limits
            SessionInfo::V2(V2::Active(active_session_info))
            | SessionInfo::V1(active_session_info) => match active_session_info.authorized_tokens {
                AuthorizedTokens::Specific => {
                    return Err(error!(SessionManagerError::InvalidVersion))
                }
                AuthorizedTokens::All => (&active_session_info.user, &vec![]),
            },
            _ => return Err(error!(SessionManagerError::InvalidVersion)),
        };
        let pending_revocations =
            convert_remaining_accounts_and_mints_to_revoke_to_pending_revocations(
                ctx.remaining_accounts,
                mints_to_revoke,
                user,
                &ctx.accounts.session.key(),
            )?;
        ctx.accounts
            .revoke_tokens(pending_revocations, ctx.bumps.session_setter)?;
        Ok(())
    }

    /// This is just to trick anchor into generating the IDL for the Session account since we don't use it in the context for `start_session`
    #[instruction(discriminator = [3])]
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
    #[account(constraint = session.sponsor == sponsor.key() @ SessionManagerError::SponsorMismatch)]
    /// CHECK: we check it against the session's sponsor
    pub sponsor: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseSession<'info> {
    #[account(mut, close = sponsor, constraint = !session.is_live()? @ SessionManagerError::SessionIsLive)]
    pub session: Account<'info, Session>,
    #[account(constraint = session.sponsor == sponsor.key() @ SessionManagerError::SponsorMismatch)]
    /// CHECK: we check it against the session's sponsor
    pub sponsor: AccountInfo<'info>,
    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [SESSION_SETTER_SEED], bump)]
    pub session_setter: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
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

    pub fn check_session_key(&self, session_key: Pubkey) -> Result<()> {
        if self.session.key() != session_key {
            return err!(SessionManagerError::SessionKeyMismatch);
        }
        Ok(())
    }

    pub fn check_chain_id(&self, chain_id: String) -> Result<()> {
        if self.chain_id.chain_id != chain_id {
            return err!(SessionManagerError::ChainIdMismatch);
        }
        Ok(())
    }

    pub fn get_domain_programs(&self, domain: &Domain) -> Result<Vec<AuthorizedProgram>> {
        require_eq!(
            self.domain_registry.key(),
            domain.get_domain_record_address(),
            SessionManagerError::DomainRecordMismatch
        );

        let domain_record = DomainRecordInner::load(
            self.domain_registry.to_account_info(),
            self.sponsor.to_account_info(),
        );
        domain_record.to_vec::<AuthorizedProgram>()
    }
}

impl<'info> RevokeSession<'info> {
    pub fn reallocate_and_refund_rent(&self) -> Result<()> {
        let new_len = 8 + get_instance_packed_len::<Session>(&self.session)?;
        self.session.to_account_info().realloc(new_len, false)?;

        let new_rent = Rent::get()?.minimum_balance(new_len);
        let current_rent = self.session.to_account_info().lamports();

        if new_rent < current_rent {
            **self.session.to_account_info().try_borrow_mut_lamports()? = new_rent;
            **self.sponsor.try_borrow_mut_lamports()? = self
                .sponsor
                .lamports()
                .checked_add(current_rent.saturating_sub(new_rent))
                .ok_or(ProgramError::ArithmeticOverflow)?;
        }
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
