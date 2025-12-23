use crate::session::AuthorizedPrograms;
use crate::session::AuthorizedTokens;
use crate::session::Session;
use crate::session::SessionError;
use crate::session::SessionInfo;
use crate::session::V2;
use crate::session::V3;
use crate::session::V4;
use solana_program::account_info::AccountInfo;
use solana_program::pubkey::Pubkey;

pub const SESSION_SETTER: Pubkey =
    solana_program::pubkey!("akbpBKqNWBiZn3ejes3ejieJ5t3vqEhoq1ZzLBG7jQo");

impl Session {
    fn authorized_tokens(&self) -> Result<&AuthorizedTokens, SessionError> {
        match &self.session_info {
            SessionInfo::V1(session) => Ok(&session.authorized_tokens),
            SessionInfo::V2(session) => match session {
                V2::Revoked(_) => Err(SessionError::Revoked),
                V2::Active(session) => Ok(&session.authorized_tokens),
            },
            SessionInfo::V3(session) => match session {
                V3::Revoked(session) => Ok(session.authorized_tokens_with_mints.as_ref()),
                V3::Active(session) => Ok(session.authorized_tokens.as_ref()),
            },
            SessionInfo::V4(session) => match session {
                V4::Revoked(session) => Ok(session.authorized_tokens_with_mints.as_ref()),
                V4::Active(session) => Ok(session.as_ref().authorized_tokens.as_ref()),
            },
            SessionInfo::Invalid => Err(SessionError::InvalidAccountVersion),
        }
    }

    fn check_user(&self, expected_user: &Pubkey) -> Result<(), SessionError> {
        if *self.user()? != *expected_user {
            return Err(SessionError::UserMismatch);
        }
        Ok(())
    }

    fn check_authorized_program_signer(&self, signers: &[AccountInfo]) -> Result<(), SessionError> {
        match self.authorized_programs()? {
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
        self.check_is_live_and_unrevoked()?;
        self.check_user(user)?;
        self.check_authorized_program_signer(signers)?;
        Ok(self.authorized_tokens()?.clone())
    }

    pub fn check_can_close_token_account(
        &self,
        source_account_owner: &Pubkey,
        destination_account_info: &AccountInfo,
    ) -> Result<(), SessionError> {
        self.check_is_live_and_unrevoked()?;
        self.check_user(source_account_owner)?;
        if destination_account_info.key != source_account_owner {
            return Err(SessionError::TokenCloseAccountWrongDestination);
        }
        Ok(())
    }
}
