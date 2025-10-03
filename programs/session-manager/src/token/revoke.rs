use crate::error::SessionManagerError;
use crate::{CloseSession, SESSION_SETTER_SEED};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_option::COption;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{revoke, spl_token, Revoke, TokenAccount};

pub struct PendingRevocation<'a, 'info> {
    pub user_account: &'a AccountInfo<'info>,
}

pub fn convert_remaining_accounts_and_mints_to_revoke_to_pending_revocations<'a, 'info>(
    accounts: &'a [AccountInfo<'info>],
    mints_to_revoke: &[Pubkey],
    user: &Pubkey,
    session_pubkey: &Pubkey,
) -> Result<Vec<PendingRevocation<'a, 'info>>> {
    require_gte!(
        accounts.len(),
        mints_to_revoke.len(),
        SessionManagerError::MissingAccount
    );
    mints_to_revoke
        .iter()
        .zip(accounts.iter())
        .map(|(mint, user_account)| {
            require_eq!(
                user_account.key(),
                get_associated_token_address(user, mint),
                SessionManagerError::AssociatedTokenAccountMismatch
            );

            if user_account.owner == &spl_token::ID {
                let account_data =
                    TokenAccount::try_deserialize(&mut user_account.data.borrow().as_ref())?;
                if account_data.delegate == COption::Some(*session_pubkey) {
                    return Ok(Some(PendingRevocation { user_account }));
                }
            }
            Ok(None)
        })
        .filter_map(|result| result.transpose())
        .collect()
}

impl<'info> CloseSession<'info> {
    /// Revoke token accounts from the session key.
    /// When closing a session, the session account is returned to the system program.
    /// We need to revoke all token delegations to the session key, otherwise the session key could still have power to spend tokens from the user accounts even if the session had expired or been revoked.
    pub fn revoke_tokens<'a>(
        &self,
        pending_revocations: Vec<PendingRevocation<'a, 'info>>,
        session_setter_bump: u8,
    ) -> Result<()> {
        pending_revocations
            .into_iter()
            .try_for_each(|PendingRevocation { user_account }| {
                let cpi_accounts = Revoke {
                    source: user_account.to_account_info(),
                    authority: self.session_setter.to_account_info(),
                };
                revoke(CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    cpi_accounts,
                    &[&[SESSION_SETTER_SEED, &[session_setter_bump]]],
                ))
            })
    }
}
