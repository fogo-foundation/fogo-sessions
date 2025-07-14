use crate::session::AuthorizedPrograms;
use crate::session::AuthorizedTokens;
use crate::session::Session;
use crate::session::SessionError;
use solana_program::account_info::AccountInfo;
use solana_program::pubkey::Pubkey;

pub const SESSION_SETTER: Pubkey =
    solana_program::pubkey!("akbpBKqNWBiZn3ejes3ejieJ5t3vqEhoq1ZzLBG7jQo");

impl Session {
    fn check_user(&self, expected_user: &Pubkey) -> Result<(), SessionError> {
        if self.session_info.user != *expected_user {
            return Err(SessionError::UserMismatch);
        }
        Ok(())
    }

    fn check_authorized_program_signer(&self, signers: &[AccountInfo]) -> Result<(), SessionError> {
        match self.session_info.authorized_programs {
            AuthorizedPrograms::Specific(ref programs) => {
                let signer_account_info = signers
                    .iter()
                    .find(|signer| programs.iter().any(|item| *signer.key == item.signer_pda))
                    .ok_or(SessionError::UnauthorizedProgram)?;
                if !signer_account_info.is_signer {
                    return Err(SessionError::MissingRequiredSignature);
                }
            }
            AuthorizedPrograms::All => {}
        }
        Ok(())
    }

    pub fn get_token_permissions_checked(
        &self,
        user: &Pubkey,
        signers: &[AccountInfo],
    ) -> Result<AuthorizedTokens, SessionError> {
        self.check_version()?;
        self.check_is_live()?;
        self.check_user(user)?;
        self.check_authorized_program_signer(signers)?;
        Ok(self.session_info.authorized_tokens.clone())
    }
}
