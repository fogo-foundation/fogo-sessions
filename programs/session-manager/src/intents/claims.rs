use anchor_lang::prelude::*;
use crate::StartSession;

#[derive(PartialEq, Debug)]
pub struct Nonce(pub(crate) Pubkey);

#[derive(PartialEq, Debug)]
pub struct Domain(pub(crate) String);

#[derive(PartialEq, Debug)]
pub struct SessionKey(pub(crate) Pubkey);


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

    pub fn get_domain_programs(&self, _domain: Domain) -> Result<Vec<(Pubkey, Pubkey)>> {
        Ok(vec![])
    }
}

