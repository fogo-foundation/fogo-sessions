use crate::error::SessionManagerError;
use crate::{StartSession, SESSION_SETTER_SEED};
use anchor_lang::prelude::*;
use anchor_spl::token::approve_checked;
use anchor_spl::{
    associated_token::get_associated_token_address,
    token::{spl_token::try_ui_amount_into_amount, ApproveChecked, Mint},
};
use mpl_token_metadata::accounts::Metadata;
use solana_intents::SymbolOrMint;

impl<'info> StartSession<'info> {
    /// Delegate token accounts to the session key.
    /// Signing an intent with the symbol "SOL" means delegating your token account for a token who has metadata symbol "SOL".
    /// Although there can be multiple tokens with the same symbol, the worst case scenario is that you're delegating the token with the most value among them, which is probably what you want.
    pub fn approve_tokens(
        &self,
        accounts: &[AccountInfo<'info>],
        tokens: &[(SymbolOrMint, String)],
        user: &Pubkey,
        session_setter_bump: u8,
    ) -> Result<Vec<Pubkey>> {
        let mut accounts_iter = accounts.iter();
        let approved_mints = tokens
            .iter()
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

                        require_eq!(mint, &mint_account.key(), SessionManagerError::MintMismatch);
                        (user_account, mint_account)
                    }
                };

                require_eq!(
                    user_account.key(),
                    get_associated_token_address(user, &mint_account.key()),
                    SessionManagerError::AssociatedTokenAccountMismatch
                );

                let mint_data = Mint::try_deserialize(&mut mint_account.data.borrow().as_ref())?;
                let amount_internal = try_ui_amount_into_amount(amount.clone(), mint_data.decimals)
                    .map_err(|_| SessionManagerError::AmountConversionFailed)?;

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
                    amount_internal,
                    mint_data.decimals,
                )?;
                Ok(mint_account.key())
            })
            .collect::<Result<Vec<Pubkey>>>()?;

        Ok(approved_mints)
    }
}
