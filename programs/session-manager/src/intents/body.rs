use crate::{error::SessionManagerError, state::AudienceItem, StartSession};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::get_associated_token_address,
    token::{self, Approve},
};
use std::collections::HashMap;

#[derive(PartialEq, Debug)]
pub struct Nonce(pub(crate) Pubkey);

#[derive(PartialEq, Debug)]
pub struct Domain(pub(crate) String);

#[derive(PartialEq, Debug)]
pub struct SessionKey(pub(crate) Pubkey);

pub struct MessageBody {
    pub domain: Domain,
    pub nonce: Nonce,
    pub session_key: SessionKey,
    pub tokens: Vec<(Pubkey, u64)>,
    pub extra: HashMap<String, String>,
}

impl<'info> StartSession<'info> {
    pub fn check_nonce(&self, _nonce: Nonce) -> Result<()> {
        // TODO
        Ok(())
    }

    pub fn check_session_key(&self, session_key: SessionKey) -> Result<()> {
        if self.session.key() != session_key.0 {
            return Err(ProgramError::InvalidArgument.into());
        }
        Ok(())
    }

    pub fn get_domain_programs(&self, _domain: Domain) -> Result<Vec<AudienceItem>> {
        // TODO
        Ok(vec![])
    }

    pub fn approve_tokens(
        &self,
        accounts: &[AccountInfo<'info>],
        tokens: &Vec<(Pubkey, u64)>,
        subject: &Pubkey,
        session_setter_bump: u8,
    ) -> Result<()> {
        for (account, (mint, amount)) in accounts.iter().zip(tokens.iter()) {
            if account.key() != get_associated_token_address(subject, mint) {
                return err!(SessionManagerError::InvalidArgument);
            }

            let cpi_accounts = Approve {
                to: account.to_account_info(),
                delegate: self.session.to_account_info(),
                authority: self.session_setter.to_account_info(),
            };

            token::approve(
                CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    cpi_accounts,
                    &[&[b"session_setter", &[session_setter_bump]]],
                ),
                *amount,
            )?;
        }

        Ok(())
    }
}
