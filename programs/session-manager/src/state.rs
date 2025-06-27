use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub chain_id: String
}