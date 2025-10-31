use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::instruction::Instruction;

pub const NTT_WITH_EXECUTOR_PROGRAM_ID: Pubkey = Pubkey::from_str_const("nex1gkSWtRBheEJuQZMqHhbMG5A45qPU76KqnCZNVHR");

pub const EXECUTOR_PROGRAM_ID: Pubkey = Pubkey::from_str_const("execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV");

pub const RELAY_NTT_MESSAGE_DISCRIMINATOR: [u8; 8] = [192, 85, 112, 237, 55, 33, 49, 150];

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RelayNttMessageArgs {
    pub recipient_chain: u16,
    pub exec_amount: u64,
    pub signed_quote_bytes: Vec<u8>,
    pub relay_instructions: Vec<u8>,
}

#[derive(Accounts)]
pub struct RelayNttMessage<'info> {
    /// CHECK: unneeded for CPI
    pub payer: AccountInfo<'info>,

    /// CHECK: unneeded for CPI
    pub payee: AccountInfo<'info>,

    /// CHECK: unneeded for CPI
    pub ntt_program_id: AccountInfo<'info>,

    /// CHECK: unneeded for CPI
    pub ntt_peer: AccountInfo<'info>,

    /// CHECK: unneeded for CPI
    pub ntt_message: AccountInfo<'info>,

    /// CHECK: unneeded for CPI
    pub executor_program: AccountInfo<'info>,

    /// CHECK: unneeded for CPI
    pub system_program: AccountInfo<'info>,
}

pub fn relay_ntt_message<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, RelayNttMessage<'info>>,
    args: RelayNttMessageArgs,
) -> Result<()> {
    let accounts = ctx.accounts;
    let account_metas = vec![
        AccountMeta::new(*accounts.payer.key, true),
        AccountMeta::new(*accounts.payee.key, false),
        AccountMeta::new_readonly(*accounts.ntt_program_id.key, false),
        AccountMeta::new_readonly(*accounts.ntt_peer.key, false),
        AccountMeta::new_readonly(*accounts.ntt_message.key, false),
        AccountMeta::new_readonly(*accounts.executor_program.key, false),
        AccountMeta::new_readonly(*accounts.system_program.key, false),
    ];

    let mut data = Vec::new();
    data.extend_from_slice(&RELAY_NTT_MESSAGE_DISCRIMINATOR);
    args.serialize(&mut data)?;

    let instruction = Instruction {
        program_id: NTT_WITH_EXECUTOR_PROGRAM_ID,
        accounts: account_metas,
        data,
    };

    let account_infos = &[
        accounts.payer,
        accounts.payee,
        accounts.ntt_program_id,
        accounts.ntt_peer,
        accounts.ntt_message,
        accounts.executor_program,
        accounts.system_program,
    ];

    solana_program::program::invoke_signed(&instruction, account_infos, ctx.signer_seeds)
        .map_err(Into::into)
}
