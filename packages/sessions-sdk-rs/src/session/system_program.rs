use crate::session::Session;
use crate::session::SessionError;
use solana_program::sysvar::Sysvar::clock::Clock;
use solana_program::pubkey::Pubkey;
use solana_program_runtime::invoke_context::InvokeContext;

impl Session {
    /// This function is meant to replace `Session::get_user_checked` in the context of the system program.
    /// It doesn't check if the session is authorized to interact with the system program, this is because a session is always authorized to interact with the system program,
    /// since all sessions can do via the system program is wrap tokens for the user.
    pub fn get_user_checked_system_program(&self, invoke_context: &Clock) -> Result<Pubkey, SessionError> {
        self.check_is_live_and_unrevoked_invoke_context(invoke_context)?;
        Ok(*self.user()?)
    }

    fn check_is_live_and_unrevoked_invoke_context(&self, clock: &Clock) -> Result<(), SessionError> {
        self.check_version()?;
        self.check_is_unrevoked()?;
        self.check_is_live_invoke_context(clock)?;
        Ok(())
    }

    fn check_is_live_invoke_context(&self, clock: &Clock) -> Result<(), SessionError> {
        if self.is_live_invoke_context(clock)? {
            Ok(())
        } else {
            Err(SessionError::Expired)
        }
    }

    fn is_live_invoke_context(&self, clock: &Clock) -> Result<bool, SessionError> {
        Ok(clock.unix_timestamp <= self.expiration()?) // we can't call the clock sysvar here because we are in a native program
    }


}