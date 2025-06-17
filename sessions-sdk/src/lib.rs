
use borsh::BorshDeserialize;
use solana_account_info::AccountInfo;
use solana_program_error::ProgramError;
use solana_pubkey::Pubkey;
use solana_sysvar::{clock::Clock, Sysvar};
use thiserror::Error;

/// DOCUMENT THIS
pub const SESSION_SETTER: Pubkey = solana_pubkey::pubkey!("FrfXhepGSPsSYXzvEsAxzVW8zDaxdWSneaERaDC1Q911");
/// DOCUMENT THIS
pub const SESSION_MANAGER: Pubkey = solana_pubkey::pubkey!("mCB9AkebGNqN7HhUPxisr7Hd8HzHifCpubj9dCwvctk");



/// SESSION ACCOUNT
#[derive(BorshDeserialize, Clone)]
pub struct SessionAccount {
    pub discriminator: [u8; 8],
    pub sponsor: Pubkey,
    pub session: SessionInfo,
}

#[derive(BorshDeserialize, Clone)]
pub struct SessionInfo {
    /// The user who started this session
    pub subject: Pubkey,
    /// The expiration time of the session
    pub expiration: i64,
    /// Programs the session key is allowed to interact with as a (program_id, signer_pda) pair. We store the signer PDAs so we don't have to recalculate them
    pub audience: Vec<AudienceItem>,
    /// Extra (key, value)'s provided by the user
    pub extra: Vec<(String, String)>,
}

#[derive(BorshDeserialize, Clone)]
pub struct AudienceItem {
    pub program_id: Pubkey,
    pub signer_pda: Pubkey,
}

impl SessionAccount {
    const DISCRIMINATOR : [u8; 8] = [243, 81, 72, 115, 214, 188, 72, 144];

    pub fn try_deserialize(data: &[u8]) -> Result<Self, ProgramError> {
        let discriminator = data.get(0..8).ok_or(ProgramError::InvalidAccountData)?;
        if discriminator != Self::DISCRIMINATOR {
            return Err(ProgramError::InvalidAccountData);
        }
        SessionAccount::try_from_slice(data).map_err(|_| ProgramError::InvalidAccountData)
    }

    pub fn check_is_live(&self) -> Result<(), ProgramError> {
        if self.session.expiration < Clock::get()?.unix_timestamp {
            return Err(SessionError::Expired.into());
        }
        Ok(())
    }

    pub fn check_subject(&self, expected_subject: &Pubkey) -> Result<(), ProgramError> {
        if self.session.subject != *expected_subject {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(())
    }

    pub fn check_audience_signer(&self, signers: &[AccountInfo]) -> Result<(), ProgramError> {
        let signer_account_info = signers.iter().find(|signer| self.session.audience.iter().find(|item| *signer.key == item.signer_pda).is_some()).ok_or(SessionError::AudienceMismatch)?;
        if !signer_account_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        Ok(())
    }

    pub fn check_audience_program(&self, program_id: &Pubkey) -> Result<(), ProgramError> {
        self.session.audience.iter().find(|audience_item| audience_item.program_id == *program_id).ok_or(SessionError::AudienceMismatch)?;
        Ok(())
    }
    
}

#[derive(Clone, Debug, Eq, Error, PartialEq)]
pub enum SessionError {
    #[error("Session is expired")]
    Expired,
    #[error("Session was created for a different user")]
    SubjectMismatch,
    #[error("Session was created for a different program")]
    AudienceMismatch,
}

impl From<SessionError> for ProgramError {
    fn from(e: SessionError) -> Self {
        ProgramError::Custom(e as u32)
    }
}