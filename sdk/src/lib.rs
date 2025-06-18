use solana_account_info::AccountInfo;
use solana_program_error::ProgramError;
use solana_pubkey::Pubkey;
use solana_sysvar::{clock::Clock, Sysvar};
use thiserror::Error;

#[cfg(feature = "borsh")]
use borsh::BorshDeserialize;

#[cfg(feature = "anchor")]
use anchor_lang::prelude::{account, borsh, AnchorDeserialize, AnchorSerialize, Discriminator};

pub const SESSION_SETTER: Pubkey =
    solana_pubkey::pubkey!("FrfXhepGSPsSYXzvEsAxzVW8zDaxdWSneaERaDC1Q911");
const ID: Pubkey = solana_pubkey::pubkey!("mCB9AkebGNqN7HhUPxisr7Hd8HzHifCpubj9dCwvctk");
pub const SESSION_MANAGER_ID: Pubkey = ID;

pub const PROGRAM_SIGNER_SEED: &[u8] = b"fogo_session_program_signer";

#[cfg_attr(feature = "anchor", account)]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize, Clone))]
#[derive(Debug)]
pub struct Session {
    #[cfg(not(feature = "anchor"))]
    pub discriminator: [u8; 8],
    pub sponsor: Pubkey,
    pub session: SessionInfo,
}

#[cfg_attr(feature = "anchor", derive(AnchorDeserialize, AnchorSerialize, Clone))]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize, Clone))]
#[derive(Debug)]
pub struct SessionInfo {
    /// The user who started this session
    pub subject: Pubkey,
    /// The expiration time of the session
    pub expiration: i64,
    /// Programs the session key is allowed to interact with as a (program_id, signer_pda) pair. We store the signer PDAs so we don't have to recalculate them
    pub audience: Vec<AudienceItem>,
    /// Extra (key, value)'s provided by the user
    pub extra: Vec<ExtraItem>,
}

#[cfg_attr(feature = "anchor", derive(AnchorDeserialize, AnchorSerialize, Clone))]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize, Clone))]
#[derive(Debug)]
pub struct ExtraItem(String, String);

#[cfg_attr(feature = "anchor", derive(AnchorDeserialize, AnchorSerialize, Clone))]
#[cfg_attr(feature = "borsh", derive(BorshDeserialize, Clone))]
#[derive(Debug)]
pub struct AudienceItem {
    pub program_id: Pubkey,
    pub signer_pda: Pubkey,
}

impl Session {
    #[cfg(feature = "borsh")]
    const DISCRIMINATOR: [u8; 8] = [243, 81, 72, 115, 214, 188, 72, 144];

    #[cfg(feature = "borsh")]
    pub fn try_deserialize(data: &mut &[u8]) -> Result<Self, ProgramError> {
        let result = Session::deserialize(data).map_err(|_| ProgramError::InvalidAccountData)?;
        if result.discriminator != Self::DISCRIMINATOR {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(result)
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
        let signer_account_info = signers
            .iter()
            .find(|signer| {
                self.session
                    .audience
                    .iter()
                    .any(|item| *signer.key == item.signer_pda)
            })
            .ok_or(SessionError::AudienceMismatch)?;
        if !signer_account_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        Ok(())
    }

    pub fn check_audience_program(&self, program_id: &Pubkey) -> Result<(), ProgramError> {
        self.session
            .audience
            .iter()
            .find(|audience_item| audience_item.program_id == *program_id)
            .ok_or(SessionError::AudienceMismatch)?;
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
