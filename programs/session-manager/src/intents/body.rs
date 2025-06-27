use crate::{error::SessionManagerError, StartSession};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::get_associated_token_address,
    token::{self, Approve, Mint},
};
use chrono::{DateTime, Utc};
use fogo_sessions_sdk::AuthorizedProgram;
use mpl_token_metadata::accounts::Metadata;
use std::{collections::HashMap, str::FromStr};

#[derive(PartialEq, Debug)]
pub struct Domain(pub(crate) String);

#[derive(PartialEq, Debug)]
pub struct SessionKey(pub(crate) Pubkey);

pub struct MessageBody {
    pub domain: Domain,
    pub expires: DateTime<Utc>,
    pub session_key: SessionKey,
    pub tokens: Vec<(String, u64)>,
    pub extra: HashMap<String, String>,
}

impl<'info> StartSession<'info> {
    pub fn check_session_key(&self, session_key: SessionKey) -> Result<()> {
        if self.session.key() != session_key.0 {
            return Err(ProgramError::InvalidArgument.into());
        }
        Ok(())
    }

    pub fn get_domain_programs(&self, _domain: Domain) -> Result<Vec<AuthorizedProgram>> {
        // TODO: implement this properly
        let pubkey = Pubkey::from_str("91VRuqpFoaPnU1aj8P7rEY53yFUn2yEFo831SVbRaq45").unwrap();
        let signer_pda = Pubkey::find_program_address(&[b"fogo_session_program_signer"], &pubkey).0;
        Ok(vec![AuthorizedProgram {
            program_id: pubkey,
            signer_pda,
        }])
    }

    /// Delegate token accounts to the session key.
    /// Signing an intent with the symbol "SOL" means delegating your token account for a token who has metadata symbol "SOL".
    /// Although there can be multiple tokens with the same symbol, the worst case scenario is that you're delegating the token with the most value among them, which is probably what you want.
    pub fn approve_tokens(
        &self,
        accounts: &[AccountInfo<'info>],
        tokens: &[(String, u64)],
        user: &Pubkey,
        session_setter_bump: u8,
    ) -> Result<()> {
        require_eq!(
            accounts.len(),
            tokens.len().saturating_mul(3),
            SessionManagerError::InvalidArgument
        );
        for (account_tuple, (symbol, amount)) in accounts.chunks_exact(3).zip(tokens.iter()) {
            let [user_account, mint, metadata] = account_tuple else {
                return Err(error!(SessionManagerError::InvalidArgument));
            };

            require_eq!(
                user_account.key(),
                get_associated_token_address(user, &mint.key()),
                SessionManagerError::InvalidArgument
            );
            require_eq!(
                metadata.key(),
                Metadata::find_pda(&mint.key()).0,
                SessionManagerError::InvalidArgument
            );

            let metadata = Metadata::try_from(metadata)?;
            require_eq!(
                &metadata.symbol,
                &format!("{symbol:\0<10}"),
                SessionManagerError::InvalidArgument
            ); // Symbols in the metadata account are padded to 10 characters

            let mint = Mint::try_deserialize(&mut mint.data.borrow().as_ref())?;
            let amount_internal = amount.saturating_mul(10u64.pow(mint.decimals.into()));

            let cpi_accounts = Approve {
                to: user_account.to_account_info(),
                delegate: self.session.to_account_info(),
                authority: self.session_setter.to_account_info(),
            };

            token::approve(
                CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    cpi_accounts,
                    &[&[b"session_setter", &[session_setter_bump]]],
                ),
                amount_internal,
            )?;
        }

        Ok(())
    }
}
