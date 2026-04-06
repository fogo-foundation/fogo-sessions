use crate::session::IsAuthorizedTokens;
use crate::session::Session;
use crate::session::SessionError;
use crate::session::UnixTimestamp;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_program::pubkey::Pubkey;
use solana_program::sysvar::clock::Clock;

/// For the system program, we don't care about the authorized_tokens, authorized_program or extra fields, but we
/// care about deserializing the session account taking roughly the same
/// amount of compute no matter the contents, because we need to manually specify how many compute units get consumed
/// so we replace the usual ActiveSessionInfo struct with this one.
#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct ActiveSessionInfo<T: IsAuthorizedTokens> {
    pub user: Pubkey,
    pub expiration: UnixTimestamp,
    #[borsh_skip]
    pub _phantom_data: std::marker::PhantomData<T>,
}

impl Session {
    /// This function is meant to replace `Session::get_user_checked` in the context of the system program.
    /// It doesn't check if the session is authorized to interact with the system program, this is because a session is always authorized to interact with the system program,
    /// since all sessions can do via the system program is wrap tokens for the user.
    /// We need pass the clock as an argument here because 'Clock::get' can't be called in a native program.
    /// THIS FUNCTION SHOULD ONLY BE CALLED IN THE SYSTEM PROGRAM, DO NOT USE THIS FUNCTION IN SBF PROGRAMS and use `Session::extract_user_from_signer_or_session` or `Session::get_user_checked` instead.
    pub fn get_user_checked_system_program(&self, clock: &Clock) -> Result<Pubkey, SessionError> {
        self.check_is_live_and_unrevoked_with_clock(clock)?;
        Ok(*self.user()?)
    }

    fn check_is_live_and_unrevoked_with_clock(&self, clock: &Clock) -> Result<(), SessionError> {
        self.check_version()?;
        self.check_is_unrevoked()?;
        self.check_is_live_with_clock(clock)?;
        Ok(())
    }

    fn check_is_live_with_clock(&self, clock: &Clock) -> Result<(), SessionError> {
        if clock.unix_timestamp <= self.expiration()? {
            Ok(())
        } else {
            Err(SessionError::Expired)
        }
    }
}
