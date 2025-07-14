// pub const SESSION_SETTER_SEED: &[u8] = b"session_setter";

// pub use fogo_sessions_sdk_core::session::{AuthorizedProgram, AuthorizedPrograms, AuthorizedTokens, Session as SessionCore, SessionInfo, SESSION_MANAGER_ID, MAJOR, MINOR};

// const ID: Pubkey = SESSION_MANAGER_ID;



// #[cfg(feature = "anchor")]
// const ERROR_CODE_OFFSET: u32 = anchor_lang::error::ERROR_CODE_OFFSET + 1000;

// #[cfg(feature = "anchor")]
// impl From<SessionError> for anchor_lang::error::Error {
//     fn from(e: SessionError) -> Self {
//         anchor_lang::error::Error::AnchorError(Box::new(AnchorError {
//             error_name: "SessionError".to_string(),
//             error_code_number: e.clone() as u32 + ERROR_CODE_OFFSET,
//             error_msg: e.to_string(),
//             error_origin: None,
//             compared_values: None,
//         }))
//     }
// }

// #[cfg(test)]
// mod tests {
//     use super::*;

//     #[test]
//     fn test_session_setter_pda_derivation() {
//         assert_eq!(
//             SESSION_SETTER,
//             Pubkey::find_program_address(&[SESSION_SETTER_SEED], &SESSION_MANAGER_ID).0
//         );
//     }
// }
