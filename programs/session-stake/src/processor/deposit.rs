use {
  anchor_lang::{
    prelude::*,
    solana_program::program::{invoke, invoke_signed},
    system_program
  },
  anchor_spl::token::{close_account, CloseAccount, Mint, Token, TokenAccount},
  fogo_sessions_sdk::token::{instruction::transfer, PROGRAM_SIGNER_SEED},
  crate::{
    processor::{extract_user_and_authority, AUTHORITY_SEED, StakeAccount},
    FOGO_MINT,
    TMP_FOGO_SEED,
  },
};

#[derive(Accounts)]
pub struct Deposit<'info> {
  pub signer_or_session: Signer<'info>,

  #[account(seeds = [PROGRAM_SIGNER_SEED], bump)]
  pub program_signer: Option<AccountInfo<'info>>,

  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(mut)]
  pub stake: Account<'info, StakeAccount>,

  /// CHECK: PDA [AUTHORITY_SEED, user.key]
  pub authority: AccountInfo<'info>,

  #[account(mut)]
  pub user_fogo: Account<'info, TokenAccount>,

  #[account(
    init_if_needed,
    payer = payer,
    token::mint = fogo_mint,
    token::authority = authority,
    seeds = [TMP_FOGO_SEED, signer_or_session.key.as_ref()],
    bump,
  )]
  pub tmp_fogo: Account<'info, TokenAccount>,

  #[account(address = FOGO_MINT)]
  pub fogo_mint: Account<'info, Mint>,

  pub token_program: Program<'info, Token>,

  pub system_program: Program<'info, System>,

  pub rent: Sysvar<'info, Rent>,
}

pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
  let program_signer = ctx.accounts.program_signer.as_ref();

  let (user, authority_key, authority_bump) =
    extract_user_and_authority(&ctx.accounts.signer_or_session)?;

  //only allow depositing to stake accounts owned by the user
  let authorized = &ctx.accounts.stake.authorized()
    .ok_or(crate::error::SessionStakeError::InvalidAuthority)?;
  require_eq!(authorized.withdrawer, authority_key, crate::error::SessionStakeError::InvalidAuthority);

  let transfer_ix = transfer(
    &ctx.accounts.token_program.key,
    &ctx.accounts.user_fogo.key(),
    &ctx.accounts.tmp_fogo.key(),
    &ctx.accounts.signer_or_session.key(),
    program_signer.map(|account_info| account_info.key()).as_ref(),
    lamports,
  )?;

  if let Some(program_signer_ref) = program_signer {
    invoke_signed(
      &transfer_ix,
      &[
        ctx.accounts.user_fogo         .to_account_info(),
        ctx.accounts.tmp_fogo          .to_account_info(),
        ctx.accounts.signer_or_session .to_account_info(),
        program_signer_ref             .to_account_info(),
      ],
      &[&[PROGRAM_SIGNER_SEED, &[ctx.bumps.program_signer.unwrap()]]],
    )?;
  } else {
    invoke(&transfer_ix, &[
      ctx.accounts.user_fogo         .to_account_info(),
      ctx.accounts.tmp_fogo          .to_account_info(),
      ctx.accounts.signer_or_session .to_account_info(),
    ])?;
  }

  close_account(CpiContext::new_with_signer(
    ctx.accounts.token_program.to_account_info(),
    CloseAccount {
      account:     ctx.accounts.tmp_fogo  .to_account_info(),
      destination: ctx.accounts.payer     .to_account_info(),
      authority:   ctx.accounts.authority .to_account_info(),
    },
    &[&[AUTHORITY_SEED, user.as_ref(), &[authority_bump]]],
  ))?;

  system_program::transfer(
    CpiContext::new(
      ctx.accounts.system_program.to_account_info(),
      system_program::Transfer {
        from: ctx.accounts.payer.to_account_info(),
        to:   ctx.accounts.stake.to_account_info(),
      },
    ),
    lamports,
  )
}
