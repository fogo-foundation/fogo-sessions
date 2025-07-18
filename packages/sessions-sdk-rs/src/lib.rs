pub mod error;
pub mod session;
pub mod token;

#[cfg(feature = "anchor")]
const ID: anchor_lang::prelude::Pubkey = session::SESSION_MANAGER_ID;