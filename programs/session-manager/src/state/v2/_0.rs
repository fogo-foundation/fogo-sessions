use crate::state::{AuthorizedPrograms, AuthorizedTokens, Extra, UnixTimestamp};
use anchor_lang::prelude::*;

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct SessionInfo {
    /// The user who started this session
    pub user: Pubkey,
    /// The expiration time of the session
    pub expiration: UnixTimestamp,
    /// Programs the session key is allowed to interact with as a (program_id, signer_pda) pair. We store the signer PDAs so we don't have to recalculate them
    pub authorized_programs: AuthorizedPrograms,
    /// Extra (key, value)'s provided by the user, they can be used to store extra arbitrary information about the session
    pub extra: Extra,
    /// Tokens the session key is allowed to interact with. If `Specific`, the spend limits are stored in each individual token account in the usual delegated_amount field.
    pub authorized_tokens: AuthorizedTokens,
}
