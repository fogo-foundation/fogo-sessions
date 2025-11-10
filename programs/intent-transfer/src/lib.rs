#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

declare_id!("Xfry4dW9m42ncAqm8LyEnyS5V6xu5DSJTMRQLiGkARD");

use anchor_lang::{
    prelude::*,
    solana_program::{bpf_loader_upgradeable, sysvar::instructions},
};
use anchor_spl::token::{
    approve, close_account, spl_token::try_ui_amount_into_amount, transfer_checked, Approve,
    CloseAccount, Mint, Token, TokenAccount, TransferChecked,
};
use chain_id::ChainId;
use mpl_token_metadata::accounts::Metadata;
use solana_intents::{Intent, SymbolOrMint};

mod bridge;
mod internal;
mod verify;
mod nonce;

use bridge::*;
use internal::*;

const INTENT_TRANSFER_SEED: &[u8] = b"intent_transfer";

#[program]
pub mod intent_transfer {
    use super::*;

    #[instruction(discriminator = [0])]
    pub fn send_tokens<'info>(ctx: Context<'_, '_, '_, 'info, SendTokens<'info>>) -> Result<()> {
        ctx.accounts
            .verify_and_send(&[&[INTENT_TRANSFER_SEED, &[ctx.bumps.intent_transfer_setter]]])
    }

    #[instruction(discriminator = [1])]
    pub fn bridge_ntt_tokens<'info>(
        ctx: Context<'_, '_, '_, 'info, BridgeNttTokens<'info>>,
        args: BridgeNttTokensArgs,
    ) -> Result<()> {
        ctx.accounts.verify_and_initiate_bridge(
            &[&[INTENT_TRANSFER_SEED, &[ctx.bumps.intent_transfer_setter]]],
            args,
        )
    }

    #[instruction(discriminator = [2])]
    pub fn register_ntt_config<'info>(
        ctx: Context<'_, '_, '_, 'info, RegisterNttConfig<'info>>,
    ) -> Result<()> {
        ctx.accounts.expected_ntt_config.manager = ctx.accounts.ntt_manager.key();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_session_setter_pda_derivation() {
        assert_eq!(
            Pubkey::from_str("EkYeW6iAtp2XsxsFZ2pDryf54qSND4RkGFCgMmX55vBL").unwrap(),
            Pubkey::find_program_address(&[INTENT_TRANSFER_SEED], &ID).0
        );
    }
}
