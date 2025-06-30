pub mod v1;
pub mod v2;

use std::collections::HashMap;

use anchor_lang::prelude::*;

type UnixTimestamp = i64;

#[account]
pub struct Session {
    /// The key that sponsored the session (gas and rent)
    pub sponsor: Pubkey,
    pub session_info: SessionInfo,
}

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
#[repr(u8)]
pub enum SessionInfo {
    V0,
    V1(v1::SessionInfo) = 1,
    V2(v2::SessionInfo) = 2,
}

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub enum AuthorizedPrograms {
    Specific(Vec<AuthorizedProgram>),
    All,
}

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub enum AuthorizedTokens {
    Specific,
    All,
}

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct AuthorizedProgram {
    /// The program ID that the session key is allowed to interact with
    pub program_id: Pubkey,
    /// The PDA of `program_id` with seeds `PROGRAM_SIGNER_SEED`, which is required to sign for in-session token transfers
    pub signer_pda: Pubkey,
}

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct Extra(Vec<ExtraItem>); // Anchor IDL generation doesn't handle vec of tuples well so we have to declare a ExtraItem struct

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct ExtraItem(String, String);

impl From<HashMap<String, String>> for Extra {
    fn from(map: HashMap<String, String>) -> Self {
        Extra(
            map.into_iter()
                .map(|(key, value)| ExtraItem(key, value))
                .collect(),
        )
    }
}
