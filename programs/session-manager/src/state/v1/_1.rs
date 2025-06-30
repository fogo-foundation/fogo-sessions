use anchor_lang::prelude::*;

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct SessionInfo {
    pub inner: super::_0::SessionInfo,
    pub new_field: u64,
}
