use std::collections::HashMap;

use anchor_lang::prelude::*;

#[account]
pub struct Session {
    pub sponsor: Pubkey,
    pub session_info : SessionInfo
}


#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SessionInfo {
    /// The user who started this session
    pub subject : Pubkey,
    /// The expiration time of the session
    pub expiration : i64,
    /// Programs the session key is allowed to interact with as a (program_id, signer_pda) pair. We store the signer PDAs so we don't have to recalculate them
    pub audience : Vec<(Pubkey,Pubkey)>,
    /// Extra (key, value)'s provided by the user
    pub extra: Extra,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Extra (Vec<(String,String)>);

impl From<HashMap<String,String>> for Extra { 
    fn from(map: HashMap<String,String>) -> Self {
        Extra(map.into_iter().map(|(key, value)| (key, value)).collect())
    }
}
