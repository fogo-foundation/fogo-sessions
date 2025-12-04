use crate::session::Session;
use crate::session::SessionError;
use solana_program::sysvar::clock::Clock;
use solana_program::pubkey::Pubkey;

impl Session {
    /// This function is meant to replace `Session::get_user_checked` in the context of the system program.
    /// It doesn't check if the session is authorized to interact with the system program, this is because a session is always authorized to interact with the system program,
    /// since all sessions can do via the system program is wrap tokens for the user.
    /// We need pass the clock as an argumenthere because 'Clock::get' can't be called in a native program.
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
        if self.is_live_with_clock(clock)? {
            Ok(())
        } else {
            Err(SessionError::Expired)
        }
    }

    fn is_live_with_clock(&self, clock: &Clock) -> Result<bool, SessionError> {
        Ok(clock.unix_timestamp <= self.expiration()?)
    }


}