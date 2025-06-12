#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`
#![allow(deprecated)] // warning: use of deprecated method `anchor_lang::prelude::AccountInfo::<'a>::realloc`: Use AccountInfo::resize() instead

use crate::intents::body::MessageBody;
use crate::intents::ed25519::Intent;
use crate::state::Session;
use crate::state::SessionInfo;
use anchor_lang::{prelude::*, solana_program::sysvar::instructions};

declare_id!("mCB9AkebGNqN7HhUPxisr7Hd8HzHifCpubj9dCwvctk");

pub mod error;
pub mod intents;
pub mod state;
#[program]
pub mod session_manager {
    use super::*;

    pub fn start_session(ctx: Context<StartSession>) -> Result<()> {
        let Intent { signer, message } = ctx.accounts.verify_intent()?;
        let MessageBody {
            domain,
            session_key,
            nonce,
            extra,
        } = message.parse()?;
        ctx.accounts.check_nonce(nonce)?;
        ctx.accounts.check_session_key(session_key)?;
        let program_domains = ctx.accounts.get_domain_programs(domain)?;

        let session = Session {
            sponsor: ctx.accounts.sponsor.key(),
            session_info: SessionInfo {
                subject: signer,
                audience: program_domains,
                extra: extra.into(),
                expiration: Clock::get()?.unix_timestamp + 3600,
            },
        };
        ctx.accounts.session.set_inner(session);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct StartSession<'info> {
    /// CHECK: we just use this to set it as the sponsor within the session
    pub sponsor: AccountInfo<'info>,
    #[account(zero)]
    pub session: Account<'info, Session>,
    /// CHECK: we check the address of this account
    #[account(address = instructions::ID)]
    pub sysvar_instructions: AccountInfo<'info>,
}
