use crate::error::SessionManagerError;
use crate::message::UiTokenAmount;
use crate::{StartSession, SESSION_SETTER_SEED};
use anchor_lang::prelude::*;
use anchor_spl::token::approve_checked;
use anchor_spl::{
    associated_token::get_associated_token_address,
    token::{ApproveChecked, Mint},
};
use mpl_token_metadata::accounts::Metadata;
use solana_intents::SymbolOrMint;

pub struct PendingApproval<'a, 'info> {
    pub user_account: &'a AccountInfo<'info>,
    pub mint_account: &'a AccountInfo<'info>,
    pub amount: UiTokenAmount,
}

impl<'a, 'info> PendingApproval<'a, 'info> {
    pub fn mint(&self) -> Pubkey{
        self.mint_account.key()
    }
}

/// Resolve the pending approvals from the remaning accounts and the tokens section of the intent.
/// In the token section of the intent, tokens are designated by their symbol or mint address. If the mint address is provided, the caller needs to provide the user associated token account and the mint account.
/// If the symbol is provided, additionally to those two accounts, the caller needs to provide the metadata account for the mint which we use to check the mint account corresponds to the symbol.
/// This behavior means that signing an intent with the symbol "SOL" means delegating your token account for a token who has metadata symbol "SOL".
/// Although there can be multiple tokens with the same symbol, the worst case scenario is that you're delegating the token with the most value among them, which is probably what you want.
pub fn resolve_pending_approvals<'a, 'info>(accounts: &'a [AccountInfo<'info>], tokens: Vec<(SymbolOrMint, UiTokenAmount)>, user: &Pubkey) -> Result<Vec<PendingApproval<'a, 'info>>> {
    let mut accounts_iter = accounts.iter();
    tokens
            .into_iter()
            .map(|(symbol_or_mint, amount)| {
                let (user_account, mint_account) = match symbol_or_mint {
                    SymbolOrMint::Symbol(symbol) => {
                        let user_account = accounts_iter
                            .next()
                            .ok_or(error!(SessionManagerError::MissingAccount))?;
                        let mint_account = accounts_iter
                            .next()
                            .ok_or(error!(SessionManagerError::MissingAccount))?;
                        let metadata_account = accounts_iter
                            .next()
                            .ok_or(error!(SessionManagerError::MissingAccount))?;

                        require_eq!(
                            metadata_account.key(),
                            Metadata::find_pda(&mint_account.key()).0,
                            SessionManagerError::MetadataMismatch
                        );
                        let metadata = Metadata::try_from(metadata_account)?;
                        require_eq!(
                            &metadata.symbol,
                            &format!("{symbol:\0<10}"),
                            SessionManagerError::SymbolMismatch
                        ); // Symbols in the metadata account are padded to 10 characters
                        (user_account, mint_account)
                    }
                    SymbolOrMint::Mint(mint) => {
                        let user_account = accounts_iter
                            .next()
                            .ok_or(error!(SessionManagerError::MissingAccount))?;
                        let mint_account = accounts_iter
                            .next()
                            .ok_or(error!(SessionManagerError::MissingAccount))?;

                        require_eq!(mint, mint_account.key(), SessionManagerError::MintMismatch);
                        (user_account, mint_account)
                    }
                };

                require_eq!(
                    user_account.key(),
                    get_associated_token_address(user, &mint_account.key()),
                    SessionManagerError::AssociatedTokenAccountMismatch
                );
                Ok(PendingApproval { user_account, mint_account, amount })
            }).collect::<Result<Vec<PendingApproval<'a, 'info>>>>()
        }

impl<'info> StartSession<'info> {
    /// Delegate token accounts to the session key.
    pub fn approve_tokens<'a>(
        &self,
        pending_approvals: Vec<PendingApproval<'a, 'info>>,
        session_setter_bump: u8,
    ) -> Result<()> {
        pending_approvals.into_iter().try_for_each(|PendingApproval { user_account, mint_account, amount }| {
                let mint_data = Mint::try_deserialize(&mut mint_account.data.borrow().as_ref())?;
                let cpi_accounts = ApproveChecked {
                    to: user_account.to_account_info(),
                    delegate: self.session.to_account_info(),
                    authority: self.session_setter.to_account_info(),
                    mint: mint_account.to_account_info(),
                };

                approve_checked(
                    CpiContext::new_with_signer(
                        self.token_program.to_account_info(),
                        cpi_accounts,
                        &[&[SESSION_SETTER_SEED, &[session_setter_bump]]],
                    ),
                    amount.to_amount_internal(mint_data.decimals)?,
                    mint_data.decimals,
                )
            })
        
    }
}
