#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`
#![allow(deprecated)] // warning: use of deprecated method `anchor_lang::prelude::AccountInfo::<'a>::realloc`: Use AccountInfo::resize() instead
use anchor_lang::prelude::*;

declare_id!("mCB9AkebGNqN7HhUPxisr7Hd8HzHifCpubj9dCwvctk");
#[program]
pub mod session_manager {
    use super::*;

    pub fn start(_ctx: Context<Start>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Start<'info> {
    pub sponsor: Signer<'info>,
}
