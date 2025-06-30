use anchor_lang::prelude::*;
use std::collections::HashMap;

pub mod _0;
pub mod _1;

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub enum SessionInfo {
    _0(_0::SessionInfo),
    _1(_1::SessionInfo),
}
