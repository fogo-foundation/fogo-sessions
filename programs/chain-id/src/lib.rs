#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

use anchor_lang::prelude::*;

declare_id!("5kf451i6V6WiF4U9yDg24beCS8eDFCkHLi1Cou6naG1Q");

pub const SEED: &[u8] = b"chain_id";

#[program]
pub mod chain_id {
    use super::*;
    pub fn set<'info>(ctx: Context<'_, '_, '_, 'info, Set<'info>>, chain_id: String) -> Result<()> {
        ctx.accounts
            .chain_id_account
            .set_inner(ChainId { chain_id });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(chain_id: String)]
pub struct Set<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,
    #[account(init, payer = sponsor, seeds = [SEED], bump, space = 8 + 4 + chain_id.len())]
    pub chain_id_account: Account<'info, ChainId>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ChainId {
    pub chain_id: String,
}
