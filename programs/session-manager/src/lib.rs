use anchor_lang::prelude::*;

declare_id!("mCB9AkebGNqN7HhUPxisr7Hd8HzHifCpubj9dCwvctk");

#[program]
pub mod session_manager {
    use super::*;

    pub fn start(ctx: Context<Start>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Start<'info> {
    pub sponsor: Signer<'info>,
}