use anchor_lang::prelude::*;
use std::collections::HashMap;

#[account]
pub struct Session {
    /// The key that sponsored the session (gas and rent)
    pub sponsor: Pubkey,
    pub session_info: SessionInfo,
}

/// Unix time (i.e. seconds since the Unix epoch).
type UnixTimestamp = i64;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SessionInfo {
    /// The user who started this session
    pub subject: Pubkey,
    /// The expiration time of the session
    pub expiration: UnixTimestamp,
    /// Programs the session key is allowed to interact with as a (program_id, signer_pda) pair. We store the signer PDAs so we don't have to recalculate them
    pub audience: Vec<AudienceItem>,
    /// Extra (key, value)'s provided by the user
    pub extra: Extra,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AudienceItem {
    pub program: Pubkey,
    pub signer_pda: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Extra(Vec<ExtraItem>); // Anchor IDL generation doesn't handle vec of tuples well so we have to declare a ExtraItem struct

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
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
