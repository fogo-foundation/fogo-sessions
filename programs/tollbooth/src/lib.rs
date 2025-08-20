#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

use anchor_lang::prelude::*;

declare_id!("7czSB69NDz3QJSveAga7igHR86ZkESEou9q845xzPkgf");

const SNAPSHOT_SEED: &[u8] = b"snapshot";

#[program]
pub mod tollbooth {
    use super::*;

    #[instruction(discriminator = [0])]
    pub fn enter<'info>(ctx: Context<'_, '_, '_, 'info, Enter<'info>>) -> Result<()> {
        ctx.accounts.sponsor_snapshot.lamports = ctx.accounts.sponsor.lamports();
        Ok(())
    }

    #[instruction(discriminator = [128])]
    pub fn exit<'info>(
        ctx: Context<'_, '_, '_, 'info, Exit<'info>>,
        max_allowed_spending: u32,
    ) -> Result<()> {
        require_gte!(
            ctx.accounts
                .sponsor
                .lamports()
                .saturating_add(u64::from(max_allowed_spending)),
            ctx.accounts.sponsor_snapshot.lamports,
            ErrorCode::ExceededMaxAllowedSpending
        );
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Enter<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,
    #[account(init, payer = sponsor, space = 8 + 8, seeds = [SNAPSHOT_SEED, sponsor.key().as_ref()], bump)]
    pub sponsor_snapshot: Account<'info, BalanceSnapshot>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Exit<'info> {
    pub sponsor: Signer<'info>,
    #[account(mut, close = sponsor, seeds = [SNAPSHOT_SEED, sponsor.key().as_ref()], bump)]
    pub sponsor_snapshot: Account<'info, BalanceSnapshot>,
}

#[account]
pub struct BalanceSnapshot {
    pub lamports: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("This transaction exceeded the maximum allowed sponsor spending")]
    ExceededMaxAllowedSpending,
}
