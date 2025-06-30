#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`
#![allow(deprecated)] // warning: use of deprecated method `anchor_lang::prelude::AccountInfo::<'a>::realloc`: Use AccountInfo::resize() instead

use crate::intents::body::MessageBody;
use crate::intents::body::Version;
use crate::intents::ed25519::Intent;
use anchor_lang::{prelude::*, solana_program::sysvar::instructions};
use anchor_spl::token::Token;
// use fogo_sessions_sdk::AuthorizedPrograms;
// use fogo_sessions_sdk::AuthorizedTokens;
// use fogo_sessions_sdk::Session;
// use fogo_sessions_sdk::SessionInfo;
use crate::state::v1;
use crate::state::AuthorizedPrograms;
use crate::state::AuthorizedTokens;
use crate::state::Session;

declare_id!("mCB9AkebGNqN7HhUPxisr7Hd8HzHifCpubj9dCwvctk");

pub mod error;
pub mod intents;
pub mod state;
#[program]
pub mod session_manager {

    use crate::state::v2;

    use super::*;

    pub fn start_session<'info>(
        ctx: Context<'_, '_, '_, 'info, StartSession<'info>>,
    ) -> Result<()> {
        let Intent { signer, message } = ctx.accounts.verify_intent()?;
        let MessageBody {
            domain,
            session_key,
            expires,
            extra,
            tokens,
            version,
        } = message.parse()?;
        ctx.accounts.check_session_key(session_key)?;
        ctx.accounts.approve_tokens(
            ctx.remaining_accounts,
            &tokens,
            &signer,
            ctx.bumps.session_setter,
        )?;
        let program_domains = ctx.accounts.get_domain_programs(domain)?;

        let session = Session {
            sponsor: ctx.accounts.sponsor.key(),
            session_info: match version {
                Version::V1_0 => state::SessionInfo::V1(v1::SessionInfo::_0(v1::_0::SessionInfo {
                    user: signer,
                    expiration: expires.timestamp(),
                    authorized_programs: AuthorizedPrograms::Specific(program_domains),
                    authorized_tokens: AuthorizedTokens::Specific,
                    extra: extra.into(),
                })),
                Version::V1_1 => state::SessionInfo::V1(v1::SessionInfo::_1(v1::_1::SessionInfo {
                    inner: v1::_0::SessionInfo {
                        user: signer,
                        expiration: expires.timestamp(),
                        authorized_programs: AuthorizedPrograms::Specific(program_domains),
                        authorized_tokens: AuthorizedTokens::Specific,
                        extra: extra.into(),
                    },
                    new_field: 9,
                })),
                Version::V2_0 => state::SessionInfo::V2(v2::SessionInfo::_0(v2::_0::SessionInfo {
                    user: signer,
                    expiration: expires.timestamp(),
                    authorized_programs: AuthorizedPrograms::Specific(program_domains),
                    extra: extra.into(),
                    authorized_tokens: AuthorizedTokens::Specific,
                })),
            },
        };
        ctx.accounts.session.set_inner(session);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct StartSession<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,
    #[account(init, payer = sponsor, space = 200)] // TODO: Compute this dynamically
    pub session: Account<'info, Session>,
    /// CHECK: we check the address of this account
    #[account(address = instructions::ID)]
    pub sysvar_instructions: AccountInfo<'info>,
    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [b"session_setter"], bump)]
    pub session_setter: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
