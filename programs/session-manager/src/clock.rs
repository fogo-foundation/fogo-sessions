use crate::error::SessionManagerError;
use anchor_lang::prelude::*;
use chrono::{DateTime, FixedOffset};

const MAX_SESSION_DURATION: i64 = 8 * 24 * 60 * 60; // 8 days

/// Checks that the expiration is not too far in the future and returns the expiration as a Unix timestamp in seconds
pub fn check_expiration(expiration: DateTime<FixedOffset>) -> Result<i64> {
    let timestamp = expiration.timestamp();
    if timestamp
        > Clock::get()?
            .unix_timestamp
            .saturating_add(MAX_SESSION_DURATION)
    {
        return err!(SessionManagerError::SessionTooLong);
    }
    Ok(timestamp)
}
