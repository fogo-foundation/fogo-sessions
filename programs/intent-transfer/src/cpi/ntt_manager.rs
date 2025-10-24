use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::instruction::Instruction;

pub const WORMHOLE_PROGRAM_ID: Pubkey = Pubkey::from_str_const("BhnQyKoQQgpuRTRo6D8Emz93PvXCYfVgHhnrR4T3qhw4");

pub const TRANSFER_BURN_DISCRIMINATOR: [u8; 8] = [75, 144, 26, 232, 39, 12, 75, 222];
pub const RELEASE_WORMHOLE_OUTBOUND_DISCRIMINATOR: [u8; 8] = [202, 87, 51, 173, 142, 160, 188, 204];
pub const SESSION_AUTHORITY_SEED: &[u8] = b"session_authority";

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ChainId {
    pub id: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TransferArgs {
    pub amount: u64,
    pub recipient_chain: ChainId,
    pub recipient_address: [u8; 32],
    pub should_queue: bool,
}

impl TransferArgs {
    pub fn keccak256(&self) -> solana_program::keccak::Hash {
        let TransferArgs {
            amount,
            recipient_chain,
            recipient_address,
            should_queue,
        } = self;
        solana_program::keccak::hashv(&[
            amount.to_be_bytes().as_ref(),
            recipient_chain.id.to_be_bytes().as_ref(),
            recipient_address,
            &[u8::from(*should_queue)],
        ])
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReleaseOutboundArgs {
    pub revert_on_delay: bool,
}

#[derive(Accounts)]
pub struct TransferBurn<'info> {
    pub payer: AccountInfo<'info>,
    pub config: AccountInfo<'info>,
    pub mint: AccountInfo<'info>,
    pub from: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub outbox_item: AccountInfo<'info>,
    pub outbox_rate_limit: AccountInfo<'info>,
    pub custody: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub inbox_rate_limit: AccountInfo<'info>,
    pub peer: AccountInfo<'info>,
    pub session_authority: AccountInfo<'info>,
    pub token_authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ReleaseWormholeOutbound<'info> {
    pub payer: AccountInfo<'info>,
    pub config: AccountInfo<'info>,
    pub outbox_item: AccountInfo<'info>,
    pub transceiver: AccountInfo<'info>,
    pub wormhole_message: AccountInfo<'info>,
    pub emitter: AccountInfo<'info>,
    pub wormhole_bridge: AccountInfo<'info>,
    pub wormhole_fee_collector: AccountInfo<'info>,
    pub wormhole_sequence: AccountInfo<'info>,
    pub wormhole_program: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub clock: AccountInfo<'info>,
    pub rent: AccountInfo<'info>,
}

pub fn transfer_burn<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, TransferBurn<'info>>,
    args: TransferArgs,
    program_id: Pubkey,
) -> Result<()> {
    let accounts = ctx.accounts;
    let account_metas = vec![
        // Common accounts
        AccountMeta::new(*accounts.payer.key, true),
        AccountMeta::new_readonly(*accounts.config.key, false),
        AccountMeta::new(*accounts.mint.key, false),
        AccountMeta::new(*accounts.from.key, false),
        AccountMeta::new_readonly(*accounts.token_program.key, false),
        AccountMeta::new(*accounts.outbox_item.key, true),
        AccountMeta::new(*accounts.outbox_rate_limit.key, false),
        AccountMeta::new(*accounts.custody.key, false),
        AccountMeta::new_readonly(*accounts.system_program.key, false),
        // Other accounts
        AccountMeta::new(*accounts.inbox_rate_limit.key, false),
        AccountMeta::new_readonly(*accounts.peer.key, false),
        AccountMeta::new_readonly(*accounts.session_authority.key, false),
        AccountMeta::new_readonly(*accounts.token_authority.key, false),
    ];

    let mut data = Vec::new();
    data.extend_from_slice(&TRANSFER_BURN_DISCRIMINATOR);
    args.serialize(&mut data)?;

    let instruction = Instruction {
        program_id,
        accounts: account_metas,
        data,
    };

    let account_infos = &[
        accounts.payer,
        accounts.config,
        accounts.mint,
        accounts.from,
        accounts.token_program,
        accounts.outbox_item,
        accounts.outbox_rate_limit,
        accounts.custody,
        accounts.system_program,
        accounts.inbox_rate_limit,
        accounts.peer,
        accounts.session_authority,
        accounts.token_authority,
    ];

    solana_program::program::invoke_signed(&instruction, account_infos, ctx.signer_seeds)
        .map_err(Into::into)
}

pub fn release_wormhole_outbound<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, ReleaseWormholeOutbound<'info>>,
    args: ReleaseOutboundArgs,
    program_id: Pubkey,
) -> Result<()> {
    let accounts = ctx.accounts;
    let account_metas = vec![
        AccountMeta::new(*accounts.payer.key, true),
        AccountMeta::new_readonly(*accounts.config.key, false),
        AccountMeta::new(*accounts.outbox_item.key, false),
        AccountMeta::new_readonly(*accounts.transceiver.key, false),
        AccountMeta::new(*accounts.wormhole_message.key, false),
        AccountMeta::new_readonly(*accounts.emitter.key, false),
        // Wormhole accounts
        AccountMeta::new(*accounts.wormhole_bridge.key, false),
        AccountMeta::new(*accounts.wormhole_fee_collector.key, false),
        AccountMeta::new(*accounts.wormhole_sequence.key, false),
        AccountMeta::new_readonly(*accounts.wormhole_program.key, false),
        AccountMeta::new_readonly(*accounts.system_program.key, false),
        AccountMeta::new_readonly(*accounts.clock.key, false),
        AccountMeta::new_readonly(*accounts.rent.key, false),
    ];

    let mut data = Vec::new();
    data.extend_from_slice(&RELEASE_WORMHOLE_OUTBOUND_DISCRIMINATOR);
    args.serialize(&mut data)?;

    let instruction = Instruction {
        program_id,
        accounts: account_metas,
        data,
    };

    let account_infos = &[
        accounts.payer,
        accounts.config,
        accounts.outbox_item,
        accounts.transceiver,
        accounts.wormhole_message,
        accounts.emitter,
        accounts.wormhole_bridge,
        accounts.wormhole_fee_collector,
        accounts.wormhole_sequence,
        accounts.wormhole_program,
        accounts.system_program,
        accounts.clock,
        accounts.rent,
    ];

    solana_program::program::invoke_signed(&instruction, account_infos, ctx.signer_seeds)
        .map_err(Into::into)
}
