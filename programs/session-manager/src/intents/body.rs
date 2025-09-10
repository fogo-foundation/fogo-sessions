use crate::SESSION_SETTER_SEED;
use crate::{error::SessionManagerError, StartSession};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::get_associated_token_address,
    token::{self, ApproveChecked, Mint},
};
use chrono::{DateTime, Utc};
use domain_registry::domain::Domain;
use domain_registry::state::DomainRecordInner;
use fogo_sessions_sdk::session::AuthorizedProgram;
use mpl_token_metadata::accounts::Metadata;
use rust_decimal::{prelude::ToPrimitive, Decimal};
use std::collections::HashMap;

#[derive(PartialEq, Debug)]
pub struct SessionKey(pub(crate) Pubkey);

pub struct MessageBody {
    pub version: Version,
    pub chain_id: String,
    pub domain: Domain,
    pub expires: DateTime<Utc>,
    pub session_key: SessionKey,
    pub tokens: Tokens,
    pub extra: HashMap<String, String>,
}

#[derive(PartialEq, Debug)]
pub struct Version {
    pub major: u8,
    pub minor: u8,
}

impl Version {
    pub fn parse_and_check(version: &str) -> Result<Self> {
        let (major, minor): (u8, u8) = {
            let (major, minor) = version
                .split_once('.')
                .ok_or(error!(SessionManagerError::ParsingErrorVersion))?;
            let major = major
                .parse()
                .map_err(|_| error!(SessionManagerError::ParsingErrorVersion))?;
            let minor = minor
                .parse()
                .map_err(|_| error!(SessionManagerError::ParsingErrorVersion))?;
            (major, minor)
        };
        if major != fogo_sessions_sdk::session::MAJOR {
            return Err(error!(SessionManagerError::InvalidVersion));
        }
        Ok(Self { major, minor })
    }
}

#[derive(PartialEq, Debug)]
pub enum Tokens {
    Specific(Vec<(SymbolOrMint, Decimal)>),
    All,
}

#[derive(PartialEq, Debug)]
pub enum SymbolOrMint {
    Symbol(String),
    Mint(Pubkey),
}

impl<'info> StartSession<'info> {
    pub fn check_session_key(&self, session_key: SessionKey) -> Result<()> {
        if self.session.key() != session_key.0 {
            return err!(SessionManagerError::SessionKeyMismatch);
        }
        Ok(())
    }

    pub fn check_chain_id(&self, chain_id: String) -> Result<()> {
        if self.chain_id.chain_id != chain_id {
            return err!(SessionManagerError::ChainIdMismatch);
        }
        Ok(())
    }

    pub fn get_domain_programs(&self, domain: Domain) -> Result<Vec<AuthorizedProgram>> {
        require_eq!(
            self.domain_registry.key(),
            domain.get_domain_record_address(),
            SessionManagerError::DomainRecordMismatch
        );

        let domain_record = DomainRecordInner::load(
            self.domain_registry.to_account_info(),
            self.sponsor.to_account_info(),
        );
        domain_record.to_vec::<AuthorizedProgram>()
    }

    /// Delegate token accounts to the session key.
    /// Signing an intent with the symbol "SOL" means delegating your token account for a token who has metadata symbol "SOL".
    /// Although there can be multiple tokens with the same symbol, the worst case scenario is that you're delegating the token with the most value among them, which is probably what you want.
    pub fn approve_tokens(
        &self,
        accounts: &[AccountInfo<'info>],
        tokens: &[(SymbolOrMint, Decimal)],
        user: &Pubkey,
        session_setter_bump: u8,
    ) -> Result<()> {
        let mut accounts_iter = accounts.iter();
        for (symbol_or_mint, amount) in tokens.iter() {
            let (user_account, mint_account) = match symbol_or_mint {
                SymbolOrMint::Symbol(symbol) => {
                    let user_account = accounts_iter
                        .next()
                        .ok_or(error!(SessionManagerError::MissingAccount))?;
                    let mint_account = accounts_iter
                        .next()
                        .ok_or(error!(SessionManagerError::MissingAccount))?;
                    let metadata_account = accounts_iter
                        .next()
                        .ok_or(error!(SessionManagerError::MissingAccount))?;

                    require_eq!(
                        metadata_account.key(),
                        Metadata::find_pda(&mint_account.key()).0,
                        SessionManagerError::MetadataMismatch
                    );
                    let metadata = Metadata::try_from(metadata_account)?;
                    require_eq!(
                        &metadata.symbol,
                        &format!("{symbol:\0<10}"),
                        SessionManagerError::SymbolMismatch
                    ); // Symbols in the metadata account are padded to 10 characters
                    (user_account, mint_account)
                }
                SymbolOrMint::Mint(mint) => {
                    let user_account = accounts_iter
                        .next()
                        .ok_or(error!(SessionManagerError::MissingAccount))?;
                    let mint_account = accounts_iter
                        .next()
                        .ok_or(error!(SessionManagerError::MissingAccount))?;

                    require_eq!(mint, &mint_account.key(), SessionManagerError::MintMismatch);
                    (user_account, mint_account)
                }
            };

            require_eq!(
                user_account.key(),
                get_associated_token_address(user, &mint_account.key()),
                SessionManagerError::AssociatedTokenAccountMismatch
            );

            let mint_data = Mint::try_deserialize(&mut mint_account.data.borrow().as_ref())?;
            let amount_internal = amount
                .saturating_mul(10u64.saturating_pow(mint_data.decimals.into()).into())
                .to_u64()
                .ok_or(error!(SessionManagerError::AmountConversionFailed))?;

            let cpi_accounts = ApproveChecked {
                to: user_account.to_account_info(),
                delegate: self.session.to_account_info(),
                authority: self.session_setter.to_account_info(),
                mint: mint_account.to_account_info(),
            };

            token::approve_checked(
                CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    cpi_accounts,
                    &[&[SESSION_SETTER_SEED, &[session_setter_bump]]],
                ),
                amount_internal,
                mint_data.decimals,
            )?;
        }

        Ok(())
    }
}
