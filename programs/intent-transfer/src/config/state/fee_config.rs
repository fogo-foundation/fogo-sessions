use anchor_lang::prelude::*;
use anchor_spl::token::spl_token::try_ui_amount_into_amount;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};
use solana_intents::SymbolOrMint;

use crate::{error::IntentTransferError, verify::verify_symbol_or_mint};

pub const FEE_CONFIG_SEED: &[u8] = b"fee_config";

#[account]
#[derive(InitSpace)]
pub struct FeeConfig {
    pub ata_creation_fee: u64,
    pub bridging_out_fee: u64,
}
