use crate::error::SessionManagerError;
use crate::{CloseSession, SESSION_SETTER_SEED};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_option::COption;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{revoke, Revoke, TokenAccount};

impl<'info> CloseSession<'info> {
    /// Delegate token accounts to the session key.
    /// Signing an intent with the symbol "SOL" means delegating your token account for a token who has metadata symbol "SOL".
    /// Although there can be multiple tokens with the same symbol, the worst case scenario is that you're delegating the token with the most value among them, which is probably what you want.
    pub fn revoke_tokens(
        &self,
        accounts: &[AccountInfo<'info>],
        mints_to_revoke: &[Pubkey],
        user: &Pubkey,
        session_setter_bump: u8,
    ) -> Result<()> {
        require_eq!(
            mints_to_revoke.len(),
            accounts.len(),
            SessionManagerError::MissingAccount
        );
        mints_to_revoke
            .iter()
            .zip(accounts.iter())
            .try_for_each(|(mint, user_account)| {
                require_eq!(
                    user_account.key(),
                    get_associated_token_address(user, mint),
                    SessionManagerError::AssociatedTokenAccountMismatch
                );

                if user_account.owner == &self.token_program.key() {
                    let account_data =
                        TokenAccount::try_deserialize(&mut user_account.data.borrow().as_ref())?;
                    if account_data.delegate == COption::Some(self.session.key()) {
                        let cpi_accounts = Revoke {
                            source: user_account.to_account_info(),
                            authority: self.session_setter.to_account_info(),
                        };
                        revoke(CpiContext::new_with_signer(
                            self.token_program.to_account_info(),
                            cpi_accounts,
                            &[&[SESSION_SETTER_SEED, &[session_setter_bump]]],
                        ))?;
                    }
                }
                Ok(())
            })
    }
}
