#![allow(unexpected_cfgs)] // warning: unexpected `cfg` condition value: `anchor-debug`

declare_id!("Xfry4dW9m42ncAqm8LyEnyS5V6xu5DSJTMRQLiGkARD");

use crate::bridge_message::{convert_chain_id_to_wormhole, BridgeMessage, NttMessage};
use crate::cpi::ntt_manager::WORMHOLE_PROGRAM_ID;
use crate::error::IntentTransferError;
use crate::message::Message;
use anchor_lang::{prelude::*, solana_program::sysvar::instructions};
use anchor_spl::token::Approve;
use anchor_spl::token::{
    approve, spl_token::try_ui_amount_into_amount, transfer_checked, Mint, Token, TokenAccount,
    TransferChecked,
};
use chain_id::ChainId;
use mpl_token_metadata::accounts::Metadata;
use solana_intents::{Intent, SymbolOrMint};

pub mod bridge_message;
pub mod cpi;
pub mod error;
mod message;

const INTENT_TRANSFER_SEED: &[u8] = b"intent_transfer";
const NONCE_SEED: &[u8] = b"nonce";

const BRIDGE_NTT_INTERMEDIATE_SEED: &[u8] = b"bridge_ntt_intermediate";
const BRIDGE_NTT_NONCE_SEED: &[u8] = b"bridge_ntt_nonce";

// TODO: pull this from somewhere?
pub const NATIVE_TOKEN_DECIMALS: u8 = 9;

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
}

// TODO: we should do some parsing of the relay_instructions and/or exec_amounts arg(s)
// in order to ensure the signed intent message does precisely what the user expects
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BridgeNttTokensArgs {
    pub exec_amount: u64,
    pub signed_quote_bytes: Vec<u8>,
    pub relay_instructions: Vec<u8>,
}

#[derive(Accounts)]
pub struct Ntt<'info> {
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

    /// CHECK: address is checked, but also verified in NTT manager program
    #[account(address = WORMHOLE_PROGRAM_ID)]
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

    pub token_program: Program<'info, Token>,

    #[account(mut, token::mint = mint)]
    pub source: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = sponsor,
        seeds = [BRIDGE_NTT_INTERMEDIATE_SEED, source.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = intent_transfer_setter
    )]
    pub intermediate_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    pub metadata: Option<UncheckedAccount<'info>>,

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

    /// This signer exists solely to protect against MITM attacks whereby a malicious actor
    /// intercepts a submitted transaction prior to any signatures being attached and changes
    /// fields not directly encoded by the intent message. For example, such an attack could
    /// alter the relay instructions in the bridging; attaching this signature prior to the
    /// transaction leaving the client protects against that attack vector. Neither this signer
    /// nor its signature are substantively required for this transaction. Note we do not need
    /// to perform any checks on this signer; its mere presence is sufficient.
    pub session_signer: Signer<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: Clock sysvar
    pub clock: Sysvar<'info, Clock>,

    /// CHECK: Rent sysvar
    pub rent: Sysvar<'info, Rent>,

    // NTT-specific accounts
    pub ntt: Ntt<'info>,
}

pub const SLOT_STALENESS_THRESHOLD: u64 = 150;

impl<'info> BridgeNttTokens<'info> {
    fn verify_and_initiate_bridge(
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
            nonce,
            sponsor,
            session_signer: _,
            system_program,
            clock,
            rent,
            ntt,
        } = self;

        let Ntt {
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
        } = ntt_message;

        if from_chain_id.chain_id != expected_chain_id {
            return err!(IntentTransferError::ChainIdMismatch);
        }

        verify_symbol_or_mint(&symbol_or_mint, metadata, mint)?;
        verify_signer_matches_source(signer, source.owner)?;
        verify_and_update_nonce(nonce, new_nonce)?;

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

        // Prepare transfer args for session authority verification
        let recipient_address_bytes = parse_recipient_address(&recipient_address)?;

        let to_chain_id_wormhole = convert_chain_id_to_wormhole(&to_chain_id)
            .ok_or(IntentTransferError::InvalidToChainId)?;

        let transfer_args = cpi::ntt_manager::TransferArgs {
            amount,
            recipient_chain: cpi::ntt_manager::ChainId {
                id: to_chain_id_wormhole,
            },
            recipient_address: recipient_address_bytes,
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
            exec_amount,
            signed_quote_bytes,
            relay_instructions,
        } = args;

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
            cpi::ntt_with_executor::RelayNttMessageArgs {
                recipient_chain: to_chain_id_wormhole,
                exec_amount,
                signed_quote_bytes,
                relay_instructions,
            },
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SendTokens<'info> {
    #[account(seeds = [chain_id::SEED], seeds::program = chain_id::ID, bump)]
    pub chain_id: Account<'info, ChainId>,

    /// CHECK: we check the address of this account
    #[account(address = instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,

    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [INTENT_TRANSFER_SEED], bump)]
    pub intent_transfer_setter: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,

    #[account(mut, token::mint = mint)]
    pub source: Account<'info, TokenAccount>,

    #[account(mut, token::mint = mint)]
    pub destination: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    pub metadata: Option<UncheckedAccount<'info>>,

    #[account(
        init_if_needed,
        payer = sponsor,
        space = Nonce::DISCRIMINATOR.len() + Nonce::INIT_SPACE,
        seeds = [NONCE_SEED, source.owner.key().as_ref()],
        bump
    )]
    pub nonce: Account<'info, Nonce>,

    #[account(mut)]
    pub sponsor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Nonce {
    pub nonce: u64,
}

impl<'info> SendTokens<'info> {
    fn verify_and_send(&mut self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        let Self {
            chain_id,
            destination,
            intent_transfer_setter,
            metadata,
            mint,
            source,
            sysvar_instructions,
            token_program,
            nonce,
            sponsor: _,
            system_program: _,
        } = self;
        let Intent {
            message:
                Message {
                    amount,
                    chain_id: expected_chain_id,
                    recipient,
                    symbol_or_mint,
                    nonce: new_nonce,
                    version: _,
                },
            signer,
        } = Intent::load(sysvar_instructions.as_ref())
            .map_err(Into::<IntentTransferError>::into)?;

        if chain_id.chain_id != expected_chain_id {
            return err!(IntentTransferError::ChainIdMismatch);
        }

        verify_symbol_or_mint(&symbol_or_mint, metadata, mint)?;
        verify_signer_matches_source(signer, source.owner)?;

        require_keys_eq!(
            recipient,
            destination.owner,
            IntentTransferError::RecipientMismatch
        );

        verify_and_update_nonce(nonce, new_nonce)?;

        transfer_checked(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                TransferChecked {
                    authority: intent_transfer_setter.to_account_info(),
                    from: source.to_account_info(),
                    mint: mint.to_account_info(),
                    to: destination.to_account_info(),
                },
                signer_seeds,
            ),
            try_ui_amount_into_amount(amount, mint.decimals)?,
            mint.decimals,
        )?;

        Ok(())
    }
}

fn verify_symbol_or_mint(
    symbol_or_mint: &SymbolOrMint,
    metadata: &Option<UncheckedAccount>,
    mint: &Account<Mint>,
) -> Result<()> {
    match (symbol_or_mint, metadata) {
        (SymbolOrMint::Symbol(ref symbol), Some(metadata)) => {
            require_keys_eq!(
                metadata.key(),
                Metadata::find_pda(&mint.key()).0,
                IntentTransferError::MetadataMismatch
            );
            require_eq!(
                &Metadata::try_from(&metadata.to_account_info())?.symbol,
                // Symbols in the metadata account are padded to 10 characters
                &format!("{symbol:\0<10}"),
                IntentTransferError::SymbolMismatch
            );
        }

        (SymbolOrMint::Symbol(_), None) => {
            return err!(IntentTransferError::MetadataAccountRequired);
        }

        (SymbolOrMint::Mint(ref expected_mint), None) => {
            require_keys_eq!(
                *expected_mint,
                mint.key(),
                IntentTransferError::MintMismatch
            );
        }

        (SymbolOrMint::Mint(_), Some(_)) => {
            return err!(IntentTransferError::MetadataAccountNotAllowed);
        }
    }
    Ok(())
}

fn verify_signer_matches_source(signer: Pubkey, source_owner: Pubkey) -> Result<()> {
    require_keys_eq!(
        signer,
        source_owner,
        IntentTransferError::SignerSourceMismatch
    );
    Ok(())
}

fn verify_and_update_nonce(nonce: &mut Account<Nonce>, new_nonce: u64) -> Result<()> {
    require_eq!(
        new_nonce,
        nonce.nonce + 1,
        IntentTransferError::NonceFailure
    );
    nonce.nonce = new_nonce;
    Ok(())
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
