use anchor_lang::prelude::*;

declare_id!("5QdNueoih49C6pmYCaUvX5TN2Sar47FQkGXKMpt5HmHg");

#[program]
pub mod session_manager {
    use super::*;

    pub fn start(ctx: Context<Start>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Start<'info> {
    pub payer: Signer<'info>,
}