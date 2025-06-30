use anchor_lang::prelude::*;

pub mod _0;

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub enum SessionInfo {
    _0(_0::SessionInfo),
}
