use crate::{
    bridge::{
        cpi::{self, ntt_with_executor::RelayNttMessageArgs},
        message::{convert_chain_id_to_wormhole, BridgeMessage, NttMessage, WormholeChainId},
    },
    config::state::{
        fee_config::{FeeConfig, FEE_CONFIG_SEED},
        ntt_config::{verify_ntt_manager, ExpectedNttConfig, EXPECTED_NTT_CONFIG_SEED},
    },
    error::IntentTransferError,
    fees::{PaidInstruction, VerifyAndCollectAccounts},
    nonce::Nonce,
    verify::{verify_and_update_nonce, verify_signer_matches_source, verify_symbol_or_mint},
    INTENT_TRANSFER_SEED,
};
use anchor_lang::{prelude::*, solana_program::sysvar::instructions};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{
        approve, close_account, spl_token::try_ui_amount_into_amount, transfer_checked, Approve,
        CloseAccount, Mint, Token, TokenAccount, TransferChecked,
    },
};
use chain_id::ChainId;
use solana_intents::Intent;

const BRIDGE_NTT_INTERMEDIATE_SEED: &[u8] = b"bridge_ntt_intermediate";
const BRIDGE_NTT_NONCE_SEED: &[u8] = b"bridge_ntt_nonce";

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BridgeNttTokensArgs {
    pub signed_quote_bytes: Vec<u8>,
    pub pay_destination_ata_rent: bool,
}

#[derive(Accounts)]
pub struct Ntt<'info> {
    /// CHECK: Clock sysvar
    pub clock: Sysvar<'info, Clock>,

    /// CHECK: Rent sysvar
    pub rent: Sysvar<'info, Rent>,

    /// CHECK: checked in NTT manager program
    pub ntt_manager: UncheckedAccount<'info>,

    /// CHECK: checked in NTT manager program
    pub ntt_config: UncheckedAccount<'info>,

    /// CHECK: checked in NTT manager program
    #[account(mut)]
    pub ntt_inbox_rate_limit: UncheckedAccount<'info>,

    /// CHECK: checked in NTT manager program
    pub ntt_session_authority: UncheckedAccount<'info>,

    /// CHECK: checked in NTT manager program
    pub ntt_token_authority: UncheckedAccount<'info>,

    /// CHECK: checked in NTT manager program
    #[account(mut)]
    pub wormhole_message: UncheckedAccount<'info>,

    /// CHECK: checked in NTT manager program
    pub transceiver: UncheckedAccount<'info>,

    /// CHECK: checked in NTT manager program
    pub emitter: UncheckedAccount<'info>,

    /// CHECK: checked in NTT manager program
    #[account(mut)]
    pub wormhole_bridge: UncheckedAccount<'info>,

    /// CHECK: checked in wormhole program
    #[account(mut)]
    pub wormhole_fee_collector: UncheckedAccount<'info>,

    /// CHECK: checked in wormhole program
    #[account(mut)]
    pub wormhole_sequence: UncheckedAccount<'info>,

    /// CHECK: address is checked in NTT manager program
    pub wormhole_program: UncheckedAccount<'info>,

    /// CHECK: address is checked
    #[account(address = cpi::ntt_with_executor::NTT_WITH_EXECUTOR_PROGRAM_ID)]
    pub ntt_with_executor_program: UncheckedAccount<'info>,

    /// CHECK: address is checked
    #[account(address = cpi::ntt_with_executor::EXECUTOR_PROGRAM_ID)]
    pub executor_program: UncheckedAccount<'info>,

    /// CHECK: check not important per https://github.com/wormholelabs-xyz/example-ntt-with-executor-svm/blob/10c51da84ee5deb9dee7b2afa69382ce90984eae/programs/example-ntt-with-executor-svm/src/lib.rs#L74-L76
    pub ntt_peer: UncheckedAccount<'info>,

    /// CHECK: check not important per https://github.com/wormholelabs-xyz/example-ntt-with-executor-svm/blob/10c51da84ee5deb9dee7b2afa69382ce90984eae/programs/example-ntt-with-executor-svm/src/lib.rs#L78-L80
    #[account(mut)]
    pub ntt_outbox_item: Signer<'info>,

    /// CHECK: check not important per https://github.com/wormhole-foundation/native-token-transfers/blob/8bd672c5164c53d5a3f9403dc7ce3450da539450/solana/programs/example-native-token-transfers/src/queue/outbox.rs#L50
    #[account(mut)]
    pub ntt_outbox_rate_limit: UncheckedAccount<'info>,

    /// CHECK: checked in NTT manager program
    #[account(mut)]
    pub ntt_custody: UncheckedAccount<'info>,

    /// CHECK: checked in NTT with executor program
    #[account(mut)]
    pub payee_ntt_with_executor: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct BridgeNttTokens<'info> {
    #[account(seeds = [chain_id::SEED], seeds::program = chain_id::ID, bump)]
    pub from_chain_id: Account<'info, ChainId>,

    /// CHECK: we check the address of this account
    #[account(address = instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,

    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [INTENT_TRANSFER_SEED], bump)]
    pub intent_transfer_setter: UncheckedAccount<'info>,

    #[account(mut, token::mint = mint)]
    pub source: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = sponsor,
        seeds = [BRIDGE_NTT_INTERMEDIATE_SEED, source.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = intent_transfer_setter,
    )]
    pub intermediate_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    pub metadata: Option<UncheckedAccount<'info>>,

    #[account(
        seeds = [EXPECTED_NTT_CONFIG_SEED, mint.key().as_ref()],
        bump,
    )]
    pub expected_ntt_config: Account<'info, ExpectedNttConfig>,

    #[account(
        init_if_needed,
        payer = sponsor,
        space = Nonce::DISCRIMINATOR.len() + Nonce::INIT_SPACE,
        seeds = [BRIDGE_NTT_NONCE_SEED, source.owner.key().as_ref()],
        bump
    )]
    pub nonce: Account<'info, Nonce>,

    #[account(mut)]
    pub sponsor: Signer<'info>,

    #[account(mut, token::mint = fee_mint, token::authority = source.owner )]
    pub fee_source: Account<'info, TokenAccount>,

    #[account(init_if_needed, payer = sponsor, associated_token::mint = fee_mint, associated_token::authority = sponsor)]
    pub fee_destination: Account<'info, TokenAccount>,

    pub fee_mint: Account<'info, Mint>,

    pub fee_metadata: Option<UncheckedAccount<'info>>,

    #[account(seeds = [FEE_CONFIG_SEED, fee_mint.key().as_ref()], bump)]
    pub fee_config: Account<'info, FeeConfig>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    // NTT-specific accounts
    pub ntt: Ntt<'info>,
}

impl<'info> PaidInstruction<'info> for BridgeNttTokens<'info> {
    fn fee_amount(&self) -> u64 {
        self.fee_config.bridge_transfer_fee
    }

    fn verify_and_collect_accounts<'a>(&'a self) -> VerifyAndCollectAccounts<'a, 'info> {
        let Self {
            fee_source,
            fee_destination,
            fee_mint,
            fee_metadata,
            intent_transfer_setter,
            token_program,
            ..
        } = self;
        VerifyAndCollectAccounts {
            fee_source,
            fee_destination,
            fee_mint,
            fee_metadata,
            intent_transfer_setter,
            token_program,
        }
    }
}

// TODO: implement slot staleness check for intent messages
impl<'info> BridgeNttTokens<'info> {
    pub fn verify_and_initiate_bridge(
        &mut self,
        signer_seeds: &[&[&[u8]]],
        args: BridgeNttTokensArgs,
    ) -> Result<()> {
        let Intent { message, signer } =
            Intent::<BridgeMessage>::load(self.sysvar_instructions.as_ref())
                .map_err(Into::<IntentTransferError>::into)?;

        match message {
            BridgeMessage::Ntt(ntt_message) => {
                self.process_ntt_bridge(ntt_message, signer, signer_seeds, args)
            }
        }
    }

    fn process_ntt_bridge(
        &mut self,
        ntt_message: NttMessage,
        signer: Pubkey,
        signer_seeds: &[&[&[u8]]],
        args: BridgeNttTokensArgs,
    ) -> Result<()> {
        let Self {
            from_chain_id,
            intent_transfer_setter,
            metadata,
            mint,
            source,
            intermediate_token_account,
            sysvar_instructions: _,
            token_program,
            expected_ntt_config,
            nonce,
            sponsor,
            system_program,
            ntt,
            ..
        } = self;

        let Ntt {
            clock,
            rent,
            ntt_manager,
            ntt_config,
            ntt_inbox_rate_limit,
            ntt_session_authority,
            ntt_token_authority,
            wormhole_message,
            transceiver,
            emitter,
            wormhole_bridge,
            wormhole_fee_collector,
            wormhole_sequence,
            wormhole_program,
            ntt_with_executor_program,
            executor_program,
            ntt_peer,
            ntt_outbox_item,
            ntt_outbox_rate_limit,
            ntt_custody,
            payee_ntt_with_executor,
        } = ntt;

        let NttMessage {
            version: _,
            from_chain_id: expected_chain_id,
            symbol_or_mint,
            amount: ui_amount,
            to_chain_id,
            recipient_address,
            nonce: new_nonce,
            fee_amount,
            fee_symbol_or_mint,
        } = ntt_message;

        if from_chain_id.chain_id != expected_chain_id {
            return err!(IntentTransferError::ChainIdMismatch);
        }

        verify_symbol_or_mint(&symbol_or_mint, metadata, mint)?;
        verify_signer_matches_source(signer, source.owner)?;
        verify_and_update_nonce(nonce, new_nonce)?;
        verify_ntt_manager(ntt_manager.key(), expected_ntt_config)?;

        let amount = try_ui_amount_into_amount(ui_amount, mint.decimals)?;

        transfer_checked(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                TransferChecked {
                    authority: intent_transfer_setter.to_account_info(),
                    from: source.to_account_info(),
                    mint: mint.to_account_info(),
                    to: intermediate_token_account.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
            mint.decimals,
        )?;

        let to_chain_id_wormhole = convert_chain_id_to_wormhole(&to_chain_id)
            .ok_or(IntentTransferError::UnsupportedToChainId)?;

        let transfer_args = cpi::ntt_manager::TransferArgs {
            amount,
            recipient_chain: cpi::ntt_manager::ChainId {
                id: to_chain_id_wormhole.into(),
            },
            recipient_address: parse_recipient_address(&recipient_address)?,
            should_queue: false,
        };

        approve(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                Approve {
                    to: intermediate_token_account.to_account_info(),
                    delegate: ntt_session_authority.to_account_info(),
                    authority: intent_transfer_setter.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        cpi::ntt_manager::transfer_burn(
            CpiContext::new(
                ntt_manager.to_account_info(),
                cpi::ntt_manager::TransferBurn {
                    payer: sponsor.to_account_info(),
                    config: ntt_config.to_account_info(),
                    mint: mint.to_account_info(),
                    from: intermediate_token_account.to_account_info(),
                    token_program: token_program.to_account_info(),
                    outbox_item: ntt_outbox_item.to_account_info(),
                    outbox_rate_limit: ntt_outbox_rate_limit.to_account_info(),
                    custody: ntt_custody.to_account_info(),
                    system_program: system_program.to_account_info(),
                    inbox_rate_limit: ntt_inbox_rate_limit.to_account_info(),
                    peer: ntt_peer.to_account_info(),
                    session_authority: ntt_session_authority.to_account_info(),
                    token_authority: ntt_token_authority.to_account_info(),
                },
            ),
            transfer_args,
            ntt_manager.key(),
        )?;

        cpi::ntt_manager::release_wormhole_outbound(
            CpiContext::new(
                ntt_manager.to_account_info(),
                cpi::ntt_manager::ReleaseWormholeOutbound {
                    payer: sponsor.to_account_info(),
                    config: ntt_config.to_account_info(),
                    outbox_item: ntt_outbox_item.to_account_info(),
                    transceiver: transceiver.to_account_info(),
                    wormhole_message: wormhole_message.to_account_info(),
                    emitter: emitter.to_account_info(),
                    wormhole_bridge: wormhole_bridge.to_account_info(),
                    wormhole_fee_collector: wormhole_fee_collector.to_account_info(),
                    wormhole_sequence: wormhole_sequence.to_account_info(),
                    wormhole_program: wormhole_program.to_account_info(),
                    system_program: system_program.to_account_info(),
                    clock: clock.to_account_info(),
                    rent: rent.to_account_info(),
                },
            ),
            cpi::ntt_manager::ReleaseOutboundArgs {
                revert_on_delay: true,
            },
            ntt_manager.key(),
        )?;

        let BridgeNttTokensArgs {
            signed_quote_bytes,
            pay_destination_ata_rent,
        } = args;

        let relay_ntt_args = compute_relay_ntt_args(
            to_chain_id_wormhole,
            signed_quote_bytes,
            pay_destination_ata_rent,
        )?;

        cpi::ntt_with_executor::relay_ntt_message(
            CpiContext::new(
                ntt_with_executor_program.to_account_info(),
                cpi::ntt_with_executor::RelayNttMessage {
                    payer: sponsor.to_account_info(),
                    payee: payee_ntt_with_executor.to_account_info(),
                    ntt_program_id: ntt_manager.to_account_info(),
                    ntt_peer: ntt_peer.to_account_info(),
                    ntt_message: ntt_outbox_item.to_account_info(),
                    executor_program: executor_program.to_account_info(),
                    system_program: system_program.to_account_info(),
                },
            ),
            relay_ntt_args,
        )?;

        close_account(CpiContext::new_with_signer(
            token_program.to_account_info(),
            CloseAccount {
                account: intermediate_token_account.to_account_info(),
                destination: sponsor.to_account_info(),
                authority: intent_transfer_setter.to_account_info(),
            },
            signer_seeds,
        ))?;

        self.verify_and_collect_fee(fee_amount, fee_symbol_or_mint, signer_seeds)
    }
}

/// Parses a recipient address string into a 32-byte array.
/// Supports Solana Pubkey (base58) and hex-encoded addresses (e.g., EVM, Sui).
fn parse_recipient_address(address_str: &str) -> Result<[u8; 32]> {
    // try to parse as Solana Pubkey first (base58 encoded, 32 bytes)
    if let Ok(pubkey) = address_str.parse::<Pubkey>() {
        return Ok(pubkey.to_bytes());
    }

    // fallback: try to parse as hex string
    let hex_str = address_str.strip_prefix("0x").unwrap_or(address_str);

    let bytes = hex::decode(hex_str).map_err(|_| IntentTransferError::InvalidRecipientAddress)?;

    if bytes.len() > 32 {
        return err!(IntentTransferError::InvalidRecipientAddress);
    }

    // left-pad with zeros to make it 32 bytes
    let mut result = [0u8; 32];
    let start_idx = 32 - bytes.len();
    result[start_idx..].copy_from_slice(&bytes);

    Ok(result)
}

/// Computes the relay ntt args to pass to the NTT with executor CPI.
fn compute_relay_ntt_args(
    to_chain_id_wormhole: WormholeChainId,
    signed_quote_bytes: Vec<u8>,
    pay_destination_ata_rent: bool,
) -> Result<RelayNttMessageArgs> {
    let (msg_value, gas_limit) = if to_chain_id_wormhole == WormholeChainId::Solana {
        compute_msg_value_and_gas_limit_solana(pay_destination_ata_rent)
    } else {
        return Err(IntentTransferError::UnsupportedToChainId.into());
    };

    // constructed in line with the gas instruction format: https://github.com/wormholelabs-xyz/example-messaging-executor?tab=readme-ov-file#relay-instructions
    let relay_instructions = [
        [1u8].as_slice(),
        gas_limit.to_be_bytes().as_slice(),
        msg_value.to_be_bytes().as_slice(),
    ]
    .concat();

    let signed_quote = SignedQuote::try_from_slice(&signed_quote_bytes)
        .map_err(|_| IntentTransferError::InvalidNttSignedQuote)?;
    let exec_amount =
        compute_exec_amount(to_chain_id_wormhole, signed_quote, gas_limit, msg_value)?;

    Ok(RelayNttMessageArgs {
        recipient_chain: to_chain_id_wormhole.into(),
        exec_amount,
        signed_quote_bytes,
        relay_instructions,
    })
}

pub const LAMPORTS_PER_SIGNATURE: u128 = 5000;
pub const RENT_TOKEN_ACCOUNT_SOLANA: u128 = 2_039_280; // equals 0.00203928 SOL

/// Based on the logic encoded in https://github.com/wormhole-foundation/native-token-transfers/blob/20fc162f4a37391694dfb0e31afedf72549ea477/solana/ts/sdk/nttWithExecutor.ts#L304-L344.
fn compute_msg_value_and_gas_limit_solana(pay_destination_ata_rent: bool) -> (u128, u128) {
    let mut msg_value = 0u128;
    msg_value = msg_value
        .saturating_add(2 * LAMPORTS_PER_SIGNATURE + 7 * LAMPORTS_PER_SIGNATURE + 1_400_000);
    msg_value = msg_value.saturating_add(2 * LAMPORTS_PER_SIGNATURE + 7 * LAMPORTS_PER_SIGNATURE);
    msg_value = msg_value.saturating_add(5000 + 3_200_000);
    msg_value = msg_value.saturating_add(5000 + 5_000_000);
    msg_value = msg_value.saturating_add(5000);
    if pay_destination_ata_rent {
        msg_value = msg_value.saturating_add(RENT_TOKEN_ACCOUNT_SOLANA);
    }

    (msg_value, 250_000)
}

// Derived from the documentation: https://github.com/wormholelabs-xyz/example-messaging-executor?tab=readme-ov-file#off-chain-quote
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SignedQuoteHeader {
    pub prefix: [u8; 4],
    pub quoter_address: [u8; 20],
    pub payee_address: [u8; 32],
    pub source_chain: u16,
    pub destination_chain: u16,
    pub expiry_time: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SignedQuote {
    pub header: SignedQuoteHeader,
    pub base_fee: u64,
    pub destination_gas_price: u64,
    pub source_price: u64,
    pub destination_price: u64,
    pub signature: [u8; 65],
}

const DECIMALS_QUOTE: u32 = 10;
const DECIMALS_MAX: u32 = 18;

fn normalize(amount: u128, decimals_from: u32, decimals_to: u32) -> Result<u128> {
    if decimals_from > decimals_to {
        Ok(amount / 10u128.pow(decimals_from - decimals_to))
    } else {
        amount
            .checked_mul(10u128.pow(decimals_to - decimals_from))
            .ok_or(ProgramError::ArithmeticOverflow.into())
    }
}

/// Computes the estimated cost of initiating the relay based on the quote details and the expected gas spend on the destination chain.
/// Based on the logic in https://github.com/wormholelabs-xyz/example-executor-ci-test/blob/6bf0e7156bf81d54f3ded707e53815a2ff62555e/src/utils.ts#L98.
fn compute_exec_amount(
    to_chain_id: WormholeChainId,
    quote: SignedQuote,
    gas_limit: u128,
    msg_value: u128,
) -> Result<u64> {
    let decimals_destination_native = to_chain_id.decimals_native();
    let decimals_destination_gas = to_chain_id.decimals_gas_price();
    let decimals_source_native = WormholeChainId::Fogo.decimals_native();

    let base_fee = u128::from(quote.base_fee);
    let source_price = u128::from(quote.source_price);
    let destination_price = u128::from(quote.destination_price);
    let destination_gas_price = u128::from(quote.destination_gas_price);

    let amount_base = normalize(base_fee, DECIMALS_QUOTE, decimals_source_native)?;

    let src_price_normalized = normalize(source_price, DECIMALS_QUOTE, DECIMALS_MAX)?;
    let dst_price_normalized = normalize(destination_price, DECIMALS_QUOTE, DECIMALS_MAX)?;
    let scaled_conversion = dst_price_normalized
        .checked_mul(10u128.pow(DECIMALS_MAX))
        .ok_or(ProgramError::ArithmeticOverflow)?
        .checked_div(src_price_normalized)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // Note that for Fogo -> Solana, assuming gas_limit = 250_000, destination_gas_price = 10_000,
    // the amount_gas computation will overflow when dest_price / src_price >= 136112947.
    let gas_limit_cost = gas_limit
        .checked_mul(destination_gas_price)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    let gas_limit_cost_normalized =
        normalize(gas_limit_cost, decimals_destination_gas, DECIMALS_MAX)?;
    let amount_gas = normalize(
        gas_limit_cost_normalized
            .checked_mul(scaled_conversion)
            .ok_or(ProgramError::ArithmeticOverflow)?
            .checked_div(10u128.pow(DECIMALS_MAX))
            .ok_or(ProgramError::ArithmeticOverflow)?,
        DECIMALS_MAX,
        decimals_source_native,
    )?;

    // Note that for Fogo -> Solana, assuming msg_val = 11_744_280,
    // the amount_msg_value computation will overflow when dest_price / src_price >= 28975.
    let msg_value_normalized = normalize(msg_value, decimals_destination_native, DECIMALS_MAX)?;
    let amount_msg_value = normalize(
        msg_value_normalized
            .checked_mul(scaled_conversion)
            .ok_or(ProgramError::ArithmeticOverflow)?
            .checked_div(10u128.pow(DECIMALS_MAX))
            .ok_or(ProgramError::ArithmeticOverflow)?,
        DECIMALS_MAX,
        decimals_source_native,
    )?;

    let total_amount = amount_base
        .checked_add(amount_gas)
        .ok_or(ProgramError::ArithmeticOverflow)?
        .checked_add(amount_msg_value)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    Ok(u64::try_from(total_amount)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_exec_amount_solana() {
        let quote = SignedQuote {
            header: SignedQuoteHeader {
                prefix: *b"EQ01",
                quoter_address: [0u8; 20],
                payee_address: [0u8; 32],
                source_chain: 0u16,
                destination_chain: 1u16,
                expiry_time: 0u64,
            },
            base_fee: 500_000_000,
            destination_gas_price: 10_000,
            source_price: 2_000_000_000,
            destination_price: 1_531_800_000_000,
            signature: [0u8; 65],
        };

        let gas_limit = 250_000u128;
        let msg_value = 9_705_000u128;

        let result = compute_exec_amount(WormholeChainId::Solana, quote, gas_limit, msg_value);

        assert_eq!(result, Ok(7484974250));
    }
}
