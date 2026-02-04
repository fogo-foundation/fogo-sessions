#![feature(prelude_import)]
#![allow(unexpected_cfgs)]
#![allow(deprecated)]
#[prelude_import]
use std::prelude::rust_2021::*;
#[macro_use]
extern crate std;
use crate::error::SessionManagerError;
use crate::message::{Message, Tokens};
use crate::token::approve::convert_remaning_accounts_and_token_limits_to_pending_approvals;
use crate::token::revoke::convert_remaining_accounts_and_mints_to_revoke_to_pending_revocations;
use anchor_lang::solana_program::borsh0_10::get_instance_packed_len;
use anchor_lang::{prelude::*, solana_program::sysvar::instructions};
use anchor_spl::token::Token;
use domain_registry::{domain::Domain, state::DomainRecordInner};
use fogo_sessions_sdk::session::ActiveSessionInfoWithDomainHash;
use fogo_sessions_sdk::session::{
    ActiveSessionInfo, AuthorizedProgram, AuthorizedPrograms, AuthorizedTokens,
    AuthorizedTokensWithMints, RevokedSessionInfo, Session, SessionInfo, V2, V3, V4,
};
use solana_intents::Intent;
use solana_intents::Version;
/// The static program ID
pub static ID: anchor_lang::solana_program::pubkey::Pubkey = anchor_lang::solana_program::pubkey::Pubkey::new_from_array([
    6u8,
    146u8,
    89u8,
    30u8,
    250u8,
    112u8,
    95u8,
    94u8,
    252u8,
    210u8,
    228u8,
    165u8,
    91u8,
    255u8,
    173u8,
    198u8,
    98u8,
    179u8,
    40u8,
    66u8,
    126u8,
    255u8,
    251u8,
    219u8,
    226u8,
    222u8,
    209u8,
    55u8,
    227u8,
    133u8,
    20u8,
    11u8,
]);
/// Const version of `ID`
pub const ID_CONST: anchor_lang::solana_program::pubkey::Pubkey = anchor_lang::solana_program::pubkey::Pubkey::new_from_array([
    6u8,
    146u8,
    89u8,
    30u8,
    250u8,
    112u8,
    95u8,
    94u8,
    252u8,
    210u8,
    228u8,
    165u8,
    91u8,
    255u8,
    173u8,
    198u8,
    98u8,
    179u8,
    40u8,
    66u8,
    126u8,
    255u8,
    251u8,
    219u8,
    226u8,
    222u8,
    209u8,
    55u8,
    227u8,
    133u8,
    20u8,
    11u8,
]);
/// Confirms that a given pubkey is equivalent to the program ID
pub fn check_id(id: &anchor_lang::solana_program::pubkey::Pubkey) -> bool {
    id == &ID
}
/// Returns the program ID
pub fn id() -> anchor_lang::solana_program::pubkey::Pubkey {
    ID
}
/// Const version of `ID`
pub const fn id_const() -> anchor_lang::solana_program::pubkey::Pubkey {
    ID_CONST
}
mod clock {
    use crate::error::SessionManagerError;
    use anchor_lang::prelude::*;
    use chrono::{DateTime, FixedOffset};
    const MAX_SESSION_DURATION: i64 = 8 * 24 * 60 * 60;
    /// Checks that the expiration is not too far in the future and returns the expiration as a Unix timestamp in seconds
    pub fn check_expiration(expiration: DateTime<FixedOffset>) -> Result<i64> {
        let timestamp = expiration.timestamp();
        if timestamp > Clock::get()?.unix_timestamp.saturating_add(MAX_SESSION_DURATION)
        {
            return Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                    error_name: SessionManagerError::SessionTooLong.name(),
                    error_code_number: SessionManagerError::SessionTooLong.into(),
                    error_msg: SessionManagerError::SessionTooLong.to_string(),
                    error_origin: Some(
                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                            filename: "programs/session-manager/src/clock.rs",
                            line: 15u32,
                        }),
                    ),
                    compared_values: None,
                }),
            );
        }
        Ok(timestamp)
    }
}
pub mod error {
    use crate::Message;
    use anchor_lang::prelude::*;
    use solana_intents::IntentError;
    #[repr(u32)]
    pub enum SessionManagerError {
        NoIntentMessageInstruction,
        IncorrectInstructionProgramId,
        SignatureVerificationUnexpectedHeader,
        InvalidVersion,
        ParseFailedError,
        DeserializeFailedError,
        ChainIdMismatch,
        SessionKeyMismatch,
        MissingAccount,
        MetadataMismatch,
        SymbolMismatch,
        MintMismatch,
        AssociatedTokenAccountMismatch,
        AmountConversionFailed,
        DomainRecordMismatch,
        SponsorMismatch,
        SessionIsLive,
        SessionTooLong,
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for SessionManagerError {
        #[inline]
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            ::core::fmt::Formatter::write_str(
                f,
                match self {
                    SessionManagerError::NoIntentMessageInstruction => {
                        "NoIntentMessageInstruction"
                    }
                    SessionManagerError::IncorrectInstructionProgramId => {
                        "IncorrectInstructionProgramId"
                    }
                    SessionManagerError::SignatureVerificationUnexpectedHeader => {
                        "SignatureVerificationUnexpectedHeader"
                    }
                    SessionManagerError::InvalidVersion => "InvalidVersion",
                    SessionManagerError::ParseFailedError => "ParseFailedError",
                    SessionManagerError::DeserializeFailedError => {
                        "DeserializeFailedError"
                    }
                    SessionManagerError::ChainIdMismatch => "ChainIdMismatch",
                    SessionManagerError::SessionKeyMismatch => "SessionKeyMismatch",
                    SessionManagerError::MissingAccount => "MissingAccount",
                    SessionManagerError::MetadataMismatch => "MetadataMismatch",
                    SessionManagerError::SymbolMismatch => "SymbolMismatch",
                    SessionManagerError::MintMismatch => "MintMismatch",
                    SessionManagerError::AssociatedTokenAccountMismatch => {
                        "AssociatedTokenAccountMismatch"
                    }
                    SessionManagerError::AmountConversionFailed => {
                        "AmountConversionFailed"
                    }
                    SessionManagerError::DomainRecordMismatch => "DomainRecordMismatch",
                    SessionManagerError::SponsorMismatch => "SponsorMismatch",
                    SessionManagerError::SessionIsLive => "SessionIsLive",
                    SessionManagerError::SessionTooLong => "SessionTooLong",
                },
            )
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for SessionManagerError {
        #[inline]
        fn clone(&self) -> SessionManagerError {
            *self
        }
    }
    #[automatically_derived]
    impl ::core::marker::Copy for SessionManagerError {}
    impl SessionManagerError {
        /// Gets the name of this [#enum_name].
        pub fn name(&self) -> String {
            match self {
                SessionManagerError::NoIntentMessageInstruction => {
                    "NoIntentMessageInstruction".to_string()
                }
                SessionManagerError::IncorrectInstructionProgramId => {
                    "IncorrectInstructionProgramId".to_string()
                }
                SessionManagerError::SignatureVerificationUnexpectedHeader => {
                    "SignatureVerificationUnexpectedHeader".to_string()
                }
                SessionManagerError::InvalidVersion => "InvalidVersion".to_string(),
                SessionManagerError::ParseFailedError => "ParseFailedError".to_string(),
                SessionManagerError::DeserializeFailedError => {
                    "DeserializeFailedError".to_string()
                }
                SessionManagerError::ChainIdMismatch => "ChainIdMismatch".to_string(),
                SessionManagerError::SessionKeyMismatch => {
                    "SessionKeyMismatch".to_string()
                }
                SessionManagerError::MissingAccount => "MissingAccount".to_string(),
                SessionManagerError::MetadataMismatch => "MetadataMismatch".to_string(),
                SessionManagerError::SymbolMismatch => "SymbolMismatch".to_string(),
                SessionManagerError::MintMismatch => "MintMismatch".to_string(),
                SessionManagerError::AssociatedTokenAccountMismatch => {
                    "AssociatedTokenAccountMismatch".to_string()
                }
                SessionManagerError::AmountConversionFailed => {
                    "AmountConversionFailed".to_string()
                }
                SessionManagerError::DomainRecordMismatch => {
                    "DomainRecordMismatch".to_string()
                }
                SessionManagerError::SponsorMismatch => "SponsorMismatch".to_string(),
                SessionManagerError::SessionIsLive => "SessionIsLive".to_string(),
                SessionManagerError::SessionTooLong => "SessionTooLong".to_string(),
            }
        }
    }
    impl From<SessionManagerError> for u32 {
        fn from(e: SessionManagerError) -> u32 {
            e as u32 + anchor_lang::error::ERROR_CODE_OFFSET
        }
    }
    impl From<SessionManagerError> for anchor_lang::error::Error {
        fn from(error_code: SessionManagerError) -> anchor_lang::error::Error {
            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                error_name: error_code.name(),
                error_code_number: error_code.into(),
                error_msg: error_code.to_string(),
                error_origin: None,
                compared_values: None,
            })
        }
    }
    impl std::fmt::Display for SessionManagerError {
        fn fmt(
            &self,
            fmt: &mut std::fmt::Formatter<'_>,
        ) -> std::result::Result<(), std::fmt::Error> {
            match self {
                SessionManagerError::NoIntentMessageInstruction => {
                    fmt.write_fmt(
                        format_args!(
                            "This transaction is missing the required intent message instruction"
                        ),
                    )
                }
                SessionManagerError::IncorrectInstructionProgramId => {
                    fmt.write_fmt(
                        format_args!(
                            "The instruction preceding the intent transfer instruction is not an ed25519 instruction"
                        ),
                    )
                }
                SessionManagerError::SignatureVerificationUnexpectedHeader => {
                    fmt.write_fmt(
                        format_args!("The ed25519 instruction\'s header is incorrect"),
                    )
                }
                SessionManagerError::InvalidVersion => {
                    fmt.write_fmt(
                        format_args!("This signed intent version is not supported"),
                    )
                }
                SessionManagerError::ParseFailedError => {
                    fmt.write_fmt(
                        format_args!(
                            "The intent message was malformed and could not be parsed"
                        ),
                    )
                }
                SessionManagerError::DeserializeFailedError => {
                    fmt.write_fmt(
                        format_args!(
                            "The borsh payload of the ed25519 instruction could not be deserialized"
                        ),
                    )
                }
                SessionManagerError::ChainIdMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "This blockchain\'s id doesn\'t match the chain id in the signed intent"
                        ),
                    )
                }
                SessionManagerError::SessionKeyMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The session key provided doesn\'t match the session key in the signed intent"
                        ),
                    )
                }
                SessionManagerError::MissingAccount => {
                    fmt.write_fmt(format_args!("An account is missing"))
                }
                SessionManagerError::MetadataMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The metadata account provided is not the metadata account of the provided mint"
                        ),
                    )
                }
                SessionManagerError::SymbolMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The symbol in the metadata account doesn\'t match the symbol in the signed intent"
                        ),
                    )
                }
                SessionManagerError::MintMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The mint provided doesn\'t match the mint in the signed intent"
                        ),
                    )
                }
                SessionManagerError::AssociatedTokenAccountMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The associated token account provided is not the associated token account of the provided user and mint"
                        ),
                    )
                }
                SessionManagerError::AmountConversionFailed => {
                    fmt.write_fmt(
                        format_args!(
                            "The provided token amount could not be converted to a u64"
                        ),
                    )
                }
                SessionManagerError::DomainRecordMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The domain record provided is not the domain record of the domain in the signed intent"
                        ),
                    )
                }
                SessionManagerError::SponsorMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The provided sponsor account doesn\'t match the session sponsor"
                        ),
                    )
                }
                SessionManagerError::SessionIsLive => {
                    fmt.write_fmt(
                        format_args!("Only expired session accounts can be closed"),
                    )
                }
                SessionManagerError::SessionTooLong => {
                    fmt.write_fmt(
                        format_args!("The provided expiration is too far in the future"),
                    )
                }
            }
        }
    }
    impl From<IntentError<<Message as TryFrom<Vec<u8>>>::Error>>
    for SessionManagerError {
        fn from(err: IntentError<<Message as TryFrom<Vec<u8>>>::Error>) -> Self {
            match err {
                IntentError::NoIntentMessageInstruction(_) => {
                    SessionManagerError::NoIntentMessageInstruction
                }
                IntentError::IncorrectInstructionProgramId => {
                    SessionManagerError::IncorrectInstructionProgramId
                }
                IntentError::SignatureVerificationUnexpectedHeader => {
                    SessionManagerError::SignatureVerificationUnexpectedHeader
                }
                IntentError::ParseFailedError(_) => SessionManagerError::ParseFailedError,
                IntentError::DeserializeFailedError(_) => {
                    SessionManagerError::DeserializeFailedError
                }
            }
        }
    }
}
mod message {
    use crate::error::SessionManagerError;
    use anchor_lang::prelude::Pubkey;
    use anchor_spl::token::spl_token::try_ui_amount_into_amount;
    use chrono::{DateTime, FixedOffset};
    use domain_registry::domain::Domain;
    use fogo_sessions_sdk::session::MAJOR;
    use nom::bytes::complete::take_while1;
    use nom::combinator::eof;
    use nom::error::FromExternalError;
    use nom::lib::std::fmt::Debug;
    use nom::multi::many0;
    use nom::sequence::delimited;
    use nom::{
        bytes::complete::tag, character::complete::line_ending,
        combinator::{map, map_opt, map_res},
        error::{Error, ParseError},
        multi::many1, sequence::preceded, AsChar, Compare, Err, IResult, Input, Offset,
        ParseTo, Parser,
    };
    use solana_intents::{
        key_value, key_value_with_key_type, tag_key_value, SymbolOrMint, Version,
    };
    use std::{collections::HashMap, str::FromStr};
    const MESSAGE_PREFIX: &str = "Fogo Sessions:\nSigning this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.\n";
    const UNLIMITED_TOKEN_PERMISSIONS_VALUE: &str = "this app may spend any amount of any token";
    const TOKENLESS_PERMISSIONS_VALUE: &str = "this app may not spend any tokens";
    const RESERVED_KEYS: [&str; 6] = [
        "version",
        "chain_id",
        "domain",
        "expires",
        "session_key",
        "tokens",
    ];
    pub struct Message {
        pub version: Version,
        pub chain_id: String,
        pub domain: Domain,
        pub expires: DateTime<FixedOffset>,
        pub session_key: Pubkey,
        pub tokens: Tokens,
        pub extra: HashMap<String, String>,
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for Message {
        #[inline]
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            let names: &'static _ = &[
                "version",
                "chain_id",
                "domain",
                "expires",
                "session_key",
                "tokens",
                "extra",
            ];
            let values: &[&dyn ::core::fmt::Debug] = &[
                &self.version,
                &self.chain_id,
                &self.domain,
                &self.expires,
                &self.session_key,
                &self.tokens,
                &&self.extra,
            ];
            ::core::fmt::Formatter::debug_struct_fields_finish(
                f,
                "Message",
                names,
                values,
            )
        }
    }
    #[automatically_derived]
    impl ::core::marker::StructuralPartialEq for Message {}
    #[automatically_derived]
    impl ::core::cmp::PartialEq for Message {
        #[inline]
        fn eq(&self, other: &Message) -> bool {
            self.version == other.version && self.chain_id == other.chain_id
                && self.domain == other.domain && self.expires == other.expires
                && self.session_key == other.session_key && self.tokens == other.tokens
                && self.extra == other.extra
        }
    }
    impl TryFrom<Vec<u8>> for Message {
        type Error = Err<Error<Vec<u8>>>;
        fn try_from(message: Vec<u8>) -> Result<Self, Self::Error> {
            match message_v0.parse(message.as_slice()) {
                Ok((_, message)) => Ok(message),
                Err(e) => Err(Err::<Error<&[u8]>>::to_owned(e)),
            }
        }
    }
    fn message_v0<I, E>(input: I) -> IResult<I, Message, E>
    where
        I: Input,
        I: ParseTo<Version>,
        I: ParseTo<String>,
        I: ParseTo<DateTime<FixedOffset>>,
        I: ParseTo<Pubkey>,
        I: ParseTo<Tokens>,
        I: Offset,
        I: for<'a> Compare<&'a str>,
        <I as Input>::Item: AsChar,
        E: ParseError<I>,
        E: FromExternalError<I, anchor_lang::error::Error>,
    {
        map(
                delimited(
                    (tag(MESSAGE_PREFIX), line_ending::<I, E>),
                    (
                        map_opt(
                            tag_key_value::<_, Version, _, _>("version"),
                            |version| {
                                if version.major == MAJOR { Some(version) } else { None }
                            },
                        ),
                        tag_key_value("chain_id"),
                        map_res(
                            tag_key_value::<_, String, _, _>("domain"),
                            |domain| { Domain::new_checked(domain.as_str()) },
                        ),
                        tag_key_value::<_, DateTime<FixedOffset>, _, _>("expires"),
                        tag_key_value("session_key"),
                        tag_key_value("tokens"),
                        map_opt(
                            many0(key_value::<I, String, _>),
                            |extra| {
                                extra
                                    .into_iter()
                                    .try_fold(
                                        HashMap::new(),
                                        |mut m, (key, value)| {
                                            let key: String = key.parse_to()?;
                                            if RESERVED_KEYS.contains(&key.as_str())
                                                || m.insert(key, value).is_some()
                                            {
                                                return None;
                                            }
                                            Some(m)
                                        },
                                    )
                            },
                        ),
                    ),
                    eof,
                ),
                |(version, chain_id, domain, expires, session_key, tokens, extra)| Message {
                    version,
                    chain_id,
                    domain,
                    expires,
                    session_key,
                    tokens,
                    extra,
                },
            )
            .parse(input)
    }
    pub struct UiTokenAmount(String);
    #[automatically_derived]
    impl ::core::fmt::Debug for UiTokenAmount {
        #[inline]
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            ::core::fmt::Formatter::debug_tuple_field1_finish(
                f,
                "UiTokenAmount",
                &&self.0,
            )
        }
    }
    #[automatically_derived]
    impl ::core::marker::StructuralPartialEq for UiTokenAmount {}
    #[automatically_derived]
    impl ::core::cmp::PartialEq for UiTokenAmount {
        #[inline]
        fn eq(&self, other: &UiTokenAmount) -> bool {
            self.0 == other.0
        }
    }
    impl UiTokenAmount {
        pub fn new(amount: String) -> Self {
            Self(amount)
        }
        pub fn into_amount_internal(
            self,
            decimals: u8,
        ) -> Result<u64, SessionManagerError> {
            try_ui_amount_into_amount(self.0, decimals)
                .map_err(|_| SessionManagerError::AmountConversionFailed)
        }
    }
    fn symbol_or_mint<I, E>(input: I) -> IResult<I, I, E>
    where
        I: Input,
        E: ParseError<I>,
        <I as Input>::Item: AsChar,
    {
        take_while1(|c: <I as Input>::Item| {
                c.is_alphanum() || ['.'].contains(&c.as_char())
            })
            .parse(input)
    }
    pub enum Tokens {
        Specific(Vec<(SymbolOrMint, UiTokenAmount)>),
        All,
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for Tokens {
        #[inline]
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                Tokens::Specific(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(
                        f,
                        "Specific",
                        &__self_0,
                    )
                }
                Tokens::All => ::core::fmt::Formatter::write_str(f, "All"),
            }
        }
    }
    #[automatically_derived]
    impl ::core::marker::StructuralPartialEq for Tokens {}
    #[automatically_derived]
    impl ::core::cmp::PartialEq for Tokens {
        #[inline]
        fn eq(&self, other: &Tokens) -> bool {
            let __self_discr = ::core::intrinsics::discriminant_value(self);
            let __arg1_discr = ::core::intrinsics::discriminant_value(other);
            __self_discr == __arg1_discr
                && match (self, other) {
                    (Tokens::Specific(__self_0), Tokens::Specific(__arg1_0)) => {
                        __self_0 == __arg1_0
                    }
                    _ => true,
                }
        }
    }
    impl FromStr for Tokens {
        type Err = Err<Error<String>>;
        fn from_str(s: &str) -> Result<Self, Self::Err> {
            match s {
                UNLIMITED_TOKEN_PERMISSIONS_VALUE => Ok(Tokens::All),
                TOKENLESS_PERMISSIONS_VALUE => {
                    Ok(Tokens::Specific(::alloc::vec::Vec::new()))
                }
                _ => {
                    map(
                            many1(
                                map_res(
                                    preceded(tag("-"), key_value_with_key_type(symbol_or_mint)),
                                    |(key, value): (&str, String)| {
                                        key.parse().map(|token| (token, UiTokenAmount::new(value)))
                                    },
                                ),
                            ),
                            Tokens::Specific,
                        )
                        .parse(s)
                        .map(|(_, tokens)| tokens)
                        .map_err(Err::<Error<&str>>::to_owned)
                }
            }
        }
    }
}
mod system_program {
    use anchor_lang::{prelude::*, system_program};
    pub fn initialize_account<'a, 'info>(
        payer: &'a AccountInfo<'info>,
        new_account: &'a AccountInfo<'info>,
        system_program: &'a AccountInfo<'info>,
        program_owner: &Pubkey,
        rent: &Rent,
        space: u64,
    ) -> Result<()> {
        let current_lamports = **new_account.try_borrow_lamports()?;
        if current_lamports == 0 {
            system_program::create_account(
                CpiContext::new(
                    system_program.to_account_info(),
                    system_program::CreateAccount {
                        from: payer.to_account_info(),
                        to: new_account.to_account_info(),
                    },
                ),
                rent
                    .minimum_balance(
                        usize::try_from(space).expect("usize is u64 in sbf programs"),
                    ),
                space,
                program_owner,
            )
        } else {
            let required_lamports = rent
                .minimum_balance(
                    usize::try_from(space).expect("usize is u64 in sbf programs"),
                )
                .max(1)
                .saturating_sub(current_lamports);
            if required_lamports > 0 {
                system_program::transfer(
                    CpiContext::new(
                        system_program.to_account_info(),
                        system_program::Transfer {
                            from: payer.to_account_info(),
                            to: new_account.to_account_info(),
                        },
                    ),
                    required_lamports,
                )?;
            }
            system_program::allocate(
                CpiContext::new(
                    system_program.to_account_info(),
                    system_program::Allocate {
                        account_to_allocate: new_account.to_account_info(),
                    },
                ),
                space,
            )?;
            system_program::assign(
                CpiContext::new(
                    system_program.to_account_info(),
                    system_program::Assign {
                        account_to_assign: new_account.to_account_info(),
                    },
                ),
                program_owner,
            )
        }
    }
}
mod token {
    pub mod approve {
        use crate::error::SessionManagerError;
        use crate::message::UiTokenAmount;
        use crate::{StartSession, SESSION_SETTER_SEED};
        use anchor_lang::prelude::*;
        use anchor_spl::token::approve_checked;
        use anchor_spl::{
            associated_token::get_associated_token_address, token::{ApproveChecked, Mint},
        };
        use mpl_token_metadata::accounts::Metadata;
        use solana_intents::SymbolOrMint;
        pub struct PendingApproval<'a, 'info> {
            pub user_account: &'a AccountInfo<'info>,
            pub mint_account: &'a AccountInfo<'info>,
            pub amount: u64,
            pub mint_decimals: u8,
        }
        impl<'a, 'info> PendingApproval<'a, 'info> {
            pub fn mint(&self) -> Pubkey {
                self.mint_account.key()
            }
        }
        /// Resolve the pending approvals from the remaining accounts and the tokens section of the intent.
        /// In the token section of the intent, tokens are designated by their symbol or mint address. If the mint address is provided, the caller needs to provide the user associated token account and the mint account.
        /// If the symbol is provided, additionally to those two accounts, the caller needs to provide the metadata account for the mint which we use to check the mint account corresponds to the symbol.
        /// This behavior means that signing an intent with the symbol "SOL" means delegating your token account for a token who has metadata symbol "SOL".
        /// Although there can be multiple tokens with the same symbol, the worst case scenario is that you're delegating the token with the most value among them, which is probably what you want.
        pub fn convert_remaning_accounts_and_token_limits_to_pending_approvals<
            'a,
            'info,
        >(
            accounts: &'a [AccountInfo<'info>],
            tokens: Vec<(SymbolOrMint, UiTokenAmount)>,
            user: &Pubkey,
        ) -> Result<Vec<PendingApproval<'a, 'info>>> {
            let mut accounts_iter = accounts.iter();
            tokens
                .into_iter()
                .map(|(symbol_or_mint, ui_token_amount)| {
                    let (user_account, mint_account) = match symbol_or_mint {
                        SymbolOrMint::Symbol(symbol) => {
                            let user_account = accounts_iter
                                .next()
                                .ok_or(
                                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                        error_name: SessionManagerError::MissingAccount.name(),
                                        error_code_number: SessionManagerError::MissingAccount
                                            .into(),
                                        error_msg: SessionManagerError::MissingAccount.to_string(),
                                        error_origin: Some(
                                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                filename: "programs/session-manager/src/token/approve.rs",
                                                line: 44u32,
                                            }),
                                        ),
                                        compared_values: None,
                                    }),
                                )?;
                            let mint_account = accounts_iter
                                .next()
                                .ok_or(
                                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                        error_name: SessionManagerError::MissingAccount.name(),
                                        error_code_number: SessionManagerError::MissingAccount
                                            .into(),
                                        error_msg: SessionManagerError::MissingAccount.to_string(),
                                        error_origin: Some(
                                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                filename: "programs/session-manager/src/token/approve.rs",
                                                line: 47u32,
                                            }),
                                        ),
                                        compared_values: None,
                                    }),
                                )?;
                            let metadata_account = accounts_iter
                                .next()
                                .ok_or(
                                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                        error_name: SessionManagerError::MissingAccount.name(),
                                        error_code_number: SessionManagerError::MissingAccount
                                            .into(),
                                        error_msg: SessionManagerError::MissingAccount.to_string(),
                                        error_origin: Some(
                                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                filename: "programs/session-manager/src/token/approve.rs",
                                                line: 50u32,
                                            }),
                                        ),
                                        compared_values: None,
                                    }),
                                )?;
                            if metadata_account.key()
                                != Metadata::find_pda(&mint_account.key()).0
                            {
                                return Err(
                                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                            error_name: SessionManagerError::MetadataMismatch.name(),
                                            error_code_number: SessionManagerError::MetadataMismatch
                                                .into(),
                                            error_msg: SessionManagerError::MetadataMismatch
                                                .to_string(),
                                            error_origin: Some(
                                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                    filename: "programs/session-manager/src/token/approve.rs",
                                                    line: 52u32,
                                                }),
                                            ),
                                            compared_values: None,
                                        })
                                        .with_values((
                                            metadata_account.key(),
                                            Metadata::find_pda(&mint_account.key()).0,
                                        )),
                                );
                            }
                            let metadata = Metadata::try_from(metadata_account)?;
                            if &metadata.symbol
                                != &::alloc::__export::must_use({
                                    let res = ::alloc::fmt::format(
                                        format_args!("{0: <10}", symbol),
                                    );
                                    res
                                })
                            {
                                return Err(
                                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                            error_name: SessionManagerError::SymbolMismatch.name(),
                                            error_code_number: SessionManagerError::SymbolMismatch
                                                .into(),
                                            error_msg: SessionManagerError::SymbolMismatch.to_string(),
                                            error_origin: Some(
                                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                    filename: "programs/session-manager/src/token/approve.rs",
                                                    line: 58u32,
                                                }),
                                            ),
                                            compared_values: None,
                                        })
                                        .with_values((
                                            &metadata.symbol,
                                            &::alloc::__export::must_use({
                                                let res = ::alloc::fmt::format(
                                                    format_args!("{0: <10}", symbol),
                                                );
                                                res
                                            }),
                                        )),
                                );
                            }
                            (user_account, mint_account)
                        }
                        SymbolOrMint::Mint(mint) => {
                            let user_account = accounts_iter
                                .next()
                                .ok_or(
                                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                        error_name: SessionManagerError::MissingAccount.name(),
                                        error_code_number: SessionManagerError::MissingAccount
                                            .into(),
                                        error_msg: SessionManagerError::MissingAccount.to_string(),
                                        error_origin: Some(
                                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                filename: "programs/session-manager/src/token/approve.rs",
                                                line: 68u32,
                                            }),
                                        ),
                                        compared_values: None,
                                    }),
                                )?;
                            let mint_account = accounts_iter
                                .next()
                                .ok_or(
                                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                        error_name: SessionManagerError::MissingAccount.name(),
                                        error_code_number: SessionManagerError::MissingAccount
                                            .into(),
                                        error_msg: SessionManagerError::MissingAccount.to_string(),
                                        error_origin: Some(
                                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                filename: "programs/session-manager/src/token/approve.rs",
                                                line: 71u32,
                                            }),
                                        ),
                                        compared_values: None,
                                    }),
                                )?;
                            if mint != mint_account.key() {
                                return Err(
                                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                            error_name: SessionManagerError::MintMismatch.name(),
                                            error_code_number: SessionManagerError::MintMismatch.into(),
                                            error_msg: SessionManagerError::MintMismatch.to_string(),
                                            error_origin: Some(
                                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                    filename: "programs/session-manager/src/token/approve.rs",
                                                    line: 73u32,
                                                }),
                                            ),
                                            compared_values: None,
                                        })
                                        .with_values((mint, mint_account.key())),
                                );
                            }
                            (user_account, mint_account)
                        }
                    };
                    if user_account.key()
                        != get_associated_token_address(user, &mint_account.key())
                    {
                        return Err(
                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                    error_name: SessionManagerError::AssociatedTokenAccountMismatch
                                        .name(),
                                    error_code_number: SessionManagerError::AssociatedTokenAccountMismatch
                                        .into(),
                                    error_msg: SessionManagerError::AssociatedTokenAccountMismatch
                                        .to_string(),
                                    error_origin: Some(
                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                            filename: "programs/session-manager/src/token/approve.rs",
                                            line: 78u32,
                                        }),
                                    ),
                                    compared_values: None,
                                })
                                .with_values((
                                    user_account.key(),
                                    get_associated_token_address(user, &mint_account.key()),
                                )),
                        );
                    }
                    let mint_data = Mint::try_deserialize(
                        &mut mint_account.data.borrow().as_ref(),
                    )?;
                    let amount = ui_token_amount
                        .into_amount_internal(mint_data.decimals)?;
                    Ok(PendingApproval {
                        user_account,
                        mint_account,
                        amount,
                        mint_decimals: mint_data.decimals,
                    })
                })
                .collect()
        }
        impl<'info> StartSession<'info> {
            /// Delegate token accounts to the session key.
            pub fn approve_tokens<'a>(
                &self,
                pending_approvals: Vec<PendingApproval<'a, 'info>>,
                session_setter_bump: u8,
            ) -> Result<()> {
                pending_approvals
                    .into_iter()
                    .try_for_each(|
                        PendingApproval {
                            user_account,
                            mint_account,
                            amount,
                            mint_decimals,
                        }|
                    {
                        let cpi_accounts = ApproveChecked {
                            to: user_account.to_account_info(),
                            delegate: self.session.to_account_info(),
                            authority: self.session_setter.to_account_info(),
                            mint: mint_account.to_account_info(),
                        };
                        approve_checked(
                            CpiContext::new_with_signer(
                                self.token_program.to_account_info(),
                                cpi_accounts,
                                &[&[SESSION_SETTER_SEED, &[session_setter_bump]]],
                            ),
                            amount,
                            mint_decimals,
                        )
                    })
            }
        }
    }
    pub mod revoke {
        use crate::error::SessionManagerError;
        use crate::{CloseSession, SESSION_SETTER_SEED};
        use anchor_lang::prelude::*;
        use anchor_lang::solana_program::program_option::COption;
        use anchor_spl::associated_token::get_associated_token_address;
        use anchor_spl::token::{revoke, spl_token, Revoke, TokenAccount};
        pub struct PendingRevocation<'a, 'info> {
            pub user_account: &'a AccountInfo<'info>,
        }
        /// Resolve the pending revocations from the remaining accounts and the mints to revoke.
        /// When closing a session, the session account is returned to the system program. We need to revoke all token delegations to the session key, otherwise the session key could still have power to spend tokens from the user accounts even if the session is expired or was revoked.
        /// The caller is reponsible for providing the user associated token accounts in the same order as the mints in the `authorized_tokens` section of the session account.
        pub fn convert_remaining_accounts_and_mints_to_revoke_to_pending_revocations<
            'a,
            'info,
        >(
            accounts: &'a [AccountInfo<'info>],
            mints_to_revoke: &[Pubkey],
            user: &Pubkey,
            session_pubkey: &Pubkey,
        ) -> Result<Vec<PendingRevocation<'a, 'info>>> {
            if accounts.len() < mints_to_revoke.len() {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                            error_name: SessionManagerError::MissingAccount.name(),
                            error_code_number: SessionManagerError::MissingAccount
                                .into(),
                            error_msg: SessionManagerError::MissingAccount.to_string(),
                            error_origin: Some(
                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                    filename: "programs/session-manager/src/token/revoke.rs",
                                    line: 21u32,
                                }),
                            ),
                            compared_values: None,
                        })
                        .with_values((accounts.len(), mints_to_revoke.len())),
                );
            }
            mints_to_revoke
                .iter()
                .zip(accounts.iter())
                .map(|(mint, user_account)| {
                    if user_account.key() != get_associated_token_address(user, mint) {
                        return Err(
                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                    error_name: SessionManagerError::AssociatedTokenAccountMismatch
                                        .name(),
                                    error_code_number: SessionManagerError::AssociatedTokenAccountMismatch
                                        .into(),
                                    error_msg: SessionManagerError::AssociatedTokenAccountMismatch
                                        .to_string(),
                                    error_origin: Some(
                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                            filename: "programs/session-manager/src/token/revoke.rs",
                                            line: 30u32,
                                        }),
                                    ),
                                    compared_values: None,
                                })
                                .with_values((
                                    user_account.key(),
                                    get_associated_token_address(user, mint),
                                )),
                        );
                    }
                    if user_account.owner == &spl_token::ID {
                        let account_data = TokenAccount::try_deserialize(
                            &mut user_account.data.borrow().as_ref(),
                        )?;
                        if account_data.delegate == COption::Some(*session_pubkey) {
                            return Ok(Some(PendingRevocation { user_account }));
                        }
                    }
                    Ok(None)
                })
                .filter_map(|result| result.transpose())
                .collect()
        }
        impl<'info> CloseSession<'info> {
            /// Revoke token accounts from the session key.
            pub fn revoke_tokens<'a>(
                &self,
                pending_revocations: Vec<PendingRevocation<'a, 'info>>,
                session_setter_bump: u8,
            ) -> Result<()> {
                pending_revocations
                    .into_iter()
                    .try_for_each(|PendingRevocation { user_account }| {
                        let cpi_accounts = Revoke {
                            source: user_account.to_account_info(),
                            authority: self.session_setter.to_account_info(),
                        };
                        revoke(
                            CpiContext::new_with_signer(
                                self.token_program.to_account_info(),
                                cpi_accounts,
                                &[&[SESSION_SETTER_SEED, &[session_setter_bump]]],
                            ),
                        )
                    })
            }
        }
    }
}
const SESSION_SETTER_SEED: &[u8] = b"session_setter";
use self::session_manager::*;
/// # Safety
#[no_mangle]
pub unsafe extern "C" fn entrypoint(input: *mut u8) -> u64 {
    let (program_id, accounts, instruction_data) = unsafe {
        ::solana_program_entrypoint::deserialize(input)
    };
    match entry(program_id, &accounts, instruction_data) {
        Ok(()) => ::solana_program_entrypoint::SUCCESS,
        Err(error) => error.into(),
    }
}
/// The Anchor codegen exposes a programming model where a user defines
/// a set of methods inside of a `#[program]` module in a way similar
/// to writing RPC request handlers. The macro then generates a bunch of
/// code wrapping these user defined methods into something that can be
/// executed on Solana.
///
/// These methods fall into one category for now.
///
/// Global methods - regular methods inside of the `#[program]`.
///
/// Care must be taken by the codegen to prevent collisions between
/// methods in these different namespaces. For this reason, Anchor uses
/// a variant of sighash to perform method dispatch, rather than
/// something like a simple enum variant discriminator.
///
/// The execution flow of the generated code can be roughly outlined:
///
/// * Start program via the entrypoint.
/// * Check whether the declared program id matches the input program
///   id. If it's not, return an error.
/// * Find and invoke the method based on whether the instruction data
///   starts with the method's discriminator.
/// * Run the method handler wrapper. This wraps the code the user
///   actually wrote, deserializing the accounts, constructing the
///   context, invoking the user's code, and finally running the exit
///   routine, which typically persists account changes.
///
/// The `entry` function here, defines the standard entry to a Solana
/// program, where execution begins.
pub fn entry<'info>(
    program_id: &Pubkey,
    accounts: &'info [AccountInfo<'info>],
    data: &[u8],
) -> anchor_lang::solana_program::entrypoint::ProgramResult {
    try_entry(program_id, accounts, data)
        .map_err(|e| {
            e.log();
            e.into()
        })
}
fn try_entry<'info>(
    program_id: &Pubkey,
    accounts: &'info [AccountInfo<'info>],
    data: &[u8],
) -> anchor_lang::Result<()> {
    if *program_id != ID {
        return Err(anchor_lang::error::ErrorCode::DeclaredProgramIdMismatch.into());
    }
    dispatch(program_id, accounts, data)
}
/// Module representing the program.
pub mod program {
    use super::*;
    /// Type representing the program.
    pub struct SessionManager;
    #[automatically_derived]
    impl ::core::clone::Clone for SessionManager {
        #[inline]
        fn clone(&self) -> SessionManager {
            SessionManager
        }
    }
    impl anchor_lang::Id for SessionManager {
        fn id() -> Pubkey {
            ID
        }
    }
}
/// Performs method dispatch.
///
/// Each instruction's discriminator is checked until the given instruction data starts with
/// the current discriminator.
///
/// If a match is found, the instruction handler is called using the given instruction data
/// excluding the prepended discriminator bytes.
///
/// If no match is found, the fallback function is executed if it exists, or an error is
/// returned if it doesn't exist.
fn dispatch<'info>(
    program_id: &Pubkey,
    accounts: &'info [AccountInfo<'info>],
    data: &[u8],
) -> anchor_lang::Result<()> {
    if data.starts_with(instruction::StartSession::DISCRIMINATOR) {
        return __private::__global::start_session(
            program_id,
            accounts,
            &data[instruction::StartSession::DISCRIMINATOR.len()..],
        );
    }
    if data.starts_with(instruction::RevokeSession::DISCRIMINATOR) {
        return __private::__global::revoke_session(
            program_id,
            accounts,
            &data[instruction::RevokeSession::DISCRIMINATOR.len()..],
        );
    }
    if data.starts_with(instruction::CloseSession::DISCRIMINATOR) {
        return __private::__global::close_session(
            program_id,
            accounts,
            &data[instruction::CloseSession::DISCRIMINATOR.len()..],
        );
    }
    if data.starts_with(anchor_lang::idl::IDL_IX_TAG_LE) {
        return __private::__idl::__idl_dispatch(
            program_id,
            accounts,
            &data[anchor_lang::idl::IDL_IX_TAG_LE.len()..],
        );
    }
    if data.starts_with(anchor_lang::event::EVENT_IX_TAG_LE) {
        return Err(anchor_lang::error::ErrorCode::EventInstructionStub.into());
    }
    Err(anchor_lang::error::ErrorCode::InstructionFallbackNotFound.into())
}
/// Create a private module to not clutter the program's namespace.
/// Defines an entrypoint for each individual instruction handler
/// wrapper.
mod __private {
    use super::*;
    /// __idl mod defines handlers for injected Anchor IDL instructions.
    pub mod __idl {
        use super::*;
        #[inline(never)]
        pub fn __idl_dispatch<'info>(
            program_id: &Pubkey,
            accounts: &'info [AccountInfo<'info>],
            idl_ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            let mut accounts = accounts;
            let mut data: &[u8] = idl_ix_data;
            let ix = anchor_lang::idl::IdlInstruction::deserialize(&mut data)
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            match ix {
                anchor_lang::idl::IdlInstruction::Create { data_len } => {
                    let mut bumps = <IdlCreateAccounts as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlCreateAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_create_account(program_id, &mut accounts, data_len)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::Resize { data_len } => {
                    let mut bumps = <IdlResizeAccount as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlResizeAccount::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_resize_account(program_id, &mut accounts, data_len)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::Close => {
                    let mut bumps = <IdlCloseAccount as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlCloseAccount::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_close_account(program_id, &mut accounts)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::CreateBuffer => {
                    let mut bumps = <IdlCreateBuffer as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlCreateBuffer::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_create_buffer(program_id, &mut accounts)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::Write { data } => {
                    let mut bumps = <IdlAccounts as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_write(program_id, &mut accounts, data)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::SetAuthority { new_authority } => {
                    let mut bumps = <IdlAccounts as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_set_authority(program_id, &mut accounts, new_authority)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::SetBuffer => {
                    let mut bumps = <IdlSetBuffer as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlSetBuffer::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_set_buffer(program_id, &mut accounts)?;
                    accounts.exit(program_id)?;
                }
            }
            Ok(())
        }
        use anchor_lang::idl::ERASED_AUTHORITY;
        pub struct IdlAccount {
            pub authority: Pubkey,
            pub data_len: u32,
        }
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlAccount {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::debug_struct_field2_finish(
                    f,
                    "IdlAccount",
                    "authority",
                    &self.authority,
                    "data_len",
                    &&self.data_len,
                )
            }
        }
        impl borsh::ser::BorshSerialize for IdlAccount
        where
            Pubkey: borsh::ser::BorshSerialize,
            u32: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.authority, writer)?;
                borsh::BorshSerialize::serialize(&self.data_len, writer)?;
                Ok(())
            }
        }
        impl borsh::de::BorshDeserialize for IdlAccount
        where
            Pubkey: borsh::BorshDeserialize,
            u32: borsh::BorshDeserialize,
        {
            fn deserialize_reader<R: borsh::maybestd::io::Read>(
                reader: &mut R,
            ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                Ok(Self {
                    authority: borsh::BorshDeserialize::deserialize_reader(reader)?,
                    data_len: borsh::BorshDeserialize::deserialize_reader(reader)?,
                })
            }
        }
        #[automatically_derived]
        impl ::core::clone::Clone for IdlAccount {
            #[inline]
            fn clone(&self) -> IdlAccount {
                IdlAccount {
                    authority: ::core::clone::Clone::clone(&self.authority),
                    data_len: ::core::clone::Clone::clone(&self.data_len),
                }
            }
        }
        #[automatically_derived]
        impl anchor_lang::AccountSerialize for IdlAccount {
            fn try_serialize<W: std::io::Write>(
                &self,
                writer: &mut W,
            ) -> anchor_lang::Result<()> {
                if writer.write_all(IdlAccount::DISCRIMINATOR).is_err() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountDidNotSerialize.into(),
                    );
                }
                if AnchorSerialize::serialize(self, writer).is_err() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountDidNotSerialize.into(),
                    );
                }
                Ok(())
            }
        }
        #[automatically_derived]
        impl anchor_lang::AccountDeserialize for IdlAccount {
            fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
                if buf.len() < IdlAccount::DISCRIMINATOR.len() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound
                            .into(),
                    );
                }
                let given_disc = &buf[..IdlAccount::DISCRIMINATOR.len()];
                if IdlAccount::DISCRIMINATOR != given_disc {
                    return Err(
                        anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                error_name: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                    .name(),
                                error_code_number: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                    .into(),
                                error_msg: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                    .to_string(),
                                error_origin: Some(
                                    anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                        filename: "programs/session-manager/src/lib.rs",
                                        line: 30u32,
                                    }),
                                ),
                                compared_values: None,
                            })
                            .with_account_name("IdlAccount"),
                    );
                }
                Self::try_deserialize_unchecked(buf)
            }
            fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
                let mut data: &[u8] = &buf[IdlAccount::DISCRIMINATOR.len()..];
                AnchorDeserialize::deserialize(&mut data)
                    .map_err(|_| {
                        anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into()
                    })
            }
        }
        #[automatically_derived]
        impl anchor_lang::Discriminator for IdlAccount {
            const DISCRIMINATOR: &'static [u8] = &[24, 70, 98, 191, 58, 144, 123, 158];
        }
        impl IdlAccount {
            pub fn address(program_id: &Pubkey) -> Pubkey {
                let program_signer = Pubkey::find_program_address(&[], program_id).0;
                Pubkey::create_with_seed(&program_signer, IdlAccount::seed(), program_id)
                    .expect("Seed is always valid")
            }
            pub fn seed() -> &'static str {
                "anchor:idl"
            }
        }
        impl anchor_lang::Owner for IdlAccount {
            fn owner() -> Pubkey {
                crate::ID
            }
        }
        pub struct IdlCreateAccounts<'info> {
            #[account(signer)]
            pub from: AccountInfo<'info>,
            #[account(mut)]
            pub to: AccountInfo<'info>,
            #[account(seeds = [], bump)]
            pub base: AccountInfo<'info>,
            pub system_program: Program<'info, System>,
            #[account(executable)]
            pub program: AccountInfo<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlCreateAccountsBumps>
        for IdlCreateAccounts<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlCreateAccountsBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let from: AccountInfo = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("from"))?;
                let to: AccountInfo = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("to"))?;
                let base: AccountInfo = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("base"))?;
                let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("system_program"))?;
                let program: AccountInfo = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("program"))?;
                if !&from.is_signer {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintSigner,
                            )
                            .with_account_name("from"),
                    );
                }
                if !&to.is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("to"),
                    );
                }
                let (__pda_address, __bump) = Pubkey::find_program_address(
                    &[],
                    &__program_id,
                );
                __bumps.base = __bump;
                if base.key() != __pda_address {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintSeeds,
                            )
                            .with_account_name("base")
                            .with_pubkeys((base.key(), __pda_address)),
                    );
                }
                if !&program.executable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintExecutable,
                            )
                            .with_account_name("program"),
                    );
                }
                Ok(IdlCreateAccounts {
                    from,
                    to,
                    base,
                    system_program,
                    program,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateAccounts<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.from.to_account_infos());
                account_infos.extend(self.to.to_account_infos());
                account_infos.extend(self.base.to_account_infos());
                account_infos.extend(self.system_program.to_account_infos());
                account_infos.extend(self.program.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlCreateAccounts<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.from.to_account_metas(Some(true)));
                account_metas.extend(self.to.to_account_metas(None));
                account_metas.extend(self.base.to_account_metas(None));
                account_metas.extend(self.system_program.to_account_metas(None));
                account_metas.extend(self.program.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlCreateAccounts<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.to, program_id)
                    .map_err(|e| e.with_account_name("to"))?;
                Ok(())
            }
        }
        pub struct IdlCreateAccountsBumps {
            pub base: u8,
        }
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlCreateAccountsBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::debug_struct_field1_finish(
                    f,
                    "IdlCreateAccountsBumps",
                    "base",
                    &&self.base,
                )
            }
        }
        impl Default for IdlCreateAccountsBumps {
            fn default() -> Self {
                IdlCreateAccountsBumps {
                    base: u8::MAX,
                }
            }
        }
        impl<'info> anchor_lang::Bumps for IdlCreateAccounts<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlCreateAccountsBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_create_accounts {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlCreateAccounts`].
            pub struct IdlCreateAccounts {
                pub from: Pubkey,
                pub to: Pubkey,
                pub base: Pubkey,
                pub system_program: Pubkey,
                pub program: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlCreateAccounts
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.from, writer)?;
                    borsh::BorshSerialize::serialize(&self.to, writer)?;
                    borsh::BorshSerialize::serialize(&self.base, writer)?;
                    borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                    borsh::BorshSerialize::serialize(&self.program, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlCreateAccounts {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.from,
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.to,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.base,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.system_program,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.program,
                                false,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_create_accounts {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlCreateAccounts`].
            pub struct IdlCreateAccounts<'info> {
                pub from: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub to: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub base: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub program: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlCreateAccounts<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.from),
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.to),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.base),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.system_program),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.program),
                                false,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateAccounts<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.from),
                        );
                    account_infos
                        .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.to));
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.base),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.system_program,
                            ),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.program),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlAccounts<'info> {
            #[account(mut, has_one = authority)]
            pub idl: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlAccountsBumps> for IdlAccounts<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlAccountsBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let idl: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("idl"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                if !AsRef::<AccountInfo>::as_ref(&idl).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("idl"),
                    );
                }
                {
                    let my_key = idl.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("idl")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlAccounts { idl, authority })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlAccounts<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.idl.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlAccounts<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.idl.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlAccounts<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.idl, program_id)
                    .map_err(|e| e.with_account_name("idl"))?;
                Ok(())
            }
        }
        pub struct IdlAccountsBumps {}
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlAccountsBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::write_str(f, "IdlAccountsBumps")
            }
        }
        impl Default for IdlAccountsBumps {
            fn default() -> Self {
                IdlAccountsBumps {}
            }
        }
        impl<'info> anchor_lang::Bumps for IdlAccounts<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlAccountsBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_accounts {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlAccounts`].
            pub struct IdlAccounts {
                pub idl: Pubkey,
                pub authority: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlAccounts
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.idl, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlAccounts {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.idl,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_accounts {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlAccounts`].
            pub struct IdlAccounts<'info> {
                pub idl: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlAccounts<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.idl),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlAccounts<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.idl),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlResizeAccount<'info> {
            #[account(mut, has_one = authority)]
            pub idl: Account<'info, IdlAccount>,
            #[account(mut, constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
            pub system_program: Program<'info, System>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlResizeAccountBumps>
        for IdlResizeAccount<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlResizeAccountBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let idl: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("idl"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("system_program"))?;
                if !AsRef::<AccountInfo>::as_ref(&idl).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("idl"),
                    );
                }
                {
                    let my_key = idl.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("idl")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                if !AsRef::<AccountInfo>::as_ref(&authority).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("authority"),
                    );
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlResizeAccount {
                    idl,
                    authority,
                    system_program,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlResizeAccount<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.idl.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos.extend(self.system_program.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlResizeAccount<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.idl.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas.extend(self.system_program.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlResizeAccount<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.idl, program_id)
                    .map_err(|e| e.with_account_name("idl"))?;
                anchor_lang::AccountsExit::exit(&self.authority, program_id)
                    .map_err(|e| e.with_account_name("authority"))?;
                Ok(())
            }
        }
        pub struct IdlResizeAccountBumps {}
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlResizeAccountBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::write_str(f, "IdlResizeAccountBumps")
            }
        }
        impl Default for IdlResizeAccountBumps {
            fn default() -> Self {
                IdlResizeAccountBumps {}
            }
        }
        impl<'info> anchor_lang::Bumps for IdlResizeAccount<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlResizeAccountBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_resize_account {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlResizeAccount`].
            pub struct IdlResizeAccount {
                pub idl: Pubkey,
                pub authority: Pubkey,
                pub system_program: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlResizeAccount
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.idl, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlResizeAccount {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.idl,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.system_program,
                                false,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_resize_account {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlResizeAccount`].
            pub struct IdlResizeAccount<'info> {
                pub idl: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlResizeAccount<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.idl),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.system_program),
                                false,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlResizeAccount<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.idl),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.system_program,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlCreateBuffer<'info> {
            #[account(zero)]
            pub buffer: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlCreateBufferBumps>
        for IdlCreateBuffer<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlCreateBufferBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                if __accounts.is_empty() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into(),
                    );
                }
                let buffer = &__accounts[0];
                *__accounts = &__accounts[1..];
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                let __anchor_rent = Rent::get()?;
                let buffer: anchor_lang::accounts::account::Account<IdlAccount> = {
                    let mut __data: &[u8] = &buffer.try_borrow_data()?;
                    let __disc = &__data[..IdlAccount::DISCRIMINATOR.len()];
                    let __has_disc = __disc.iter().any(|b| *b != 0);
                    if __has_disc {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintZero,
                                )
                                .with_account_name("buffer"),
                        );
                    }
                    match anchor_lang::accounts::account::Account::try_from_unchecked(
                        &buffer,
                    ) {
                        Ok(val) => val,
                        Err(e) => return Err(e.with_account_name("buffer")),
                    }
                };
                if !AsRef::<AccountInfo>::as_ref(&buffer).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !__anchor_rent
                    .is_exempt(
                        buffer.to_account_info().lamports(),
                        buffer.to_account_info().try_data_len()?,
                    )
                {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRentExempt,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlCreateBuffer {
                    buffer,
                    authority,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateBuffer<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.buffer.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlCreateBuffer<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.buffer.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlCreateBuffer<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.buffer, program_id)
                    .map_err(|e| e.with_account_name("buffer"))?;
                Ok(())
            }
        }
        pub struct IdlCreateBufferBumps {}
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlCreateBufferBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::write_str(f, "IdlCreateBufferBumps")
            }
        }
        impl Default for IdlCreateBufferBumps {
            fn default() -> Self {
                IdlCreateBufferBumps {}
            }
        }
        impl<'info> anchor_lang::Bumps for IdlCreateBuffer<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlCreateBufferBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_create_buffer {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlCreateBuffer`].
            pub struct IdlCreateBuffer {
                pub buffer: Pubkey,
                pub authority: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlCreateBuffer
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.buffer, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlCreateBuffer {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.buffer,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_create_buffer {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlCreateBuffer`].
            pub struct IdlCreateBuffer<'info> {
                pub buffer: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlCreateBuffer<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.buffer),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateBuffer<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.buffer),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlSetBuffer<'info> {
            #[account(mut, constraint = buffer.authority = = idl.authority)]
            pub buffer: Account<'info, IdlAccount>,
            #[account(mut, has_one = authority)]
            pub idl: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlSetBufferBumps>
        for IdlSetBuffer<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlSetBufferBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let buffer: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("buffer"))?;
                let idl: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("idl"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                if !AsRef::<AccountInfo>::as_ref(&buffer).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !(buffer.authority == idl.authority) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !AsRef::<AccountInfo>::as_ref(&idl).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("idl"),
                    );
                }
                {
                    let my_key = idl.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("idl")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlSetBuffer {
                    buffer,
                    idl,
                    authority,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlSetBuffer<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.buffer.to_account_infos());
                account_infos.extend(self.idl.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlSetBuffer<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.buffer.to_account_metas(None));
                account_metas.extend(self.idl.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlSetBuffer<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.buffer, program_id)
                    .map_err(|e| e.with_account_name("buffer"))?;
                anchor_lang::AccountsExit::exit(&self.idl, program_id)
                    .map_err(|e| e.with_account_name("idl"))?;
                Ok(())
            }
        }
        pub struct IdlSetBufferBumps {}
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlSetBufferBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::write_str(f, "IdlSetBufferBumps")
            }
        }
        impl Default for IdlSetBufferBumps {
            fn default() -> Self {
                IdlSetBufferBumps {}
            }
        }
        impl<'info> anchor_lang::Bumps for IdlSetBuffer<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlSetBufferBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_set_buffer {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlSetBuffer`].
            pub struct IdlSetBuffer {
                pub buffer: Pubkey,
                pub idl: Pubkey,
                pub authority: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlSetBuffer
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.buffer, writer)?;
                    borsh::BorshSerialize::serialize(&self.idl, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlSetBuffer {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.buffer,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.idl,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_set_buffer {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlSetBuffer`].
            pub struct IdlSetBuffer<'info> {
                pub buffer: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub idl: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlSetBuffer<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.buffer),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.idl),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlSetBuffer<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.buffer),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.idl),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlCloseAccount<'info> {
            #[account(mut, has_one = authority, close = sol_destination)]
            pub account: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
            #[account(mut)]
            pub sol_destination: AccountInfo<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlCloseAccountBumps>
        for IdlCloseAccount<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlCloseAccountBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let account: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("account"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                let sol_destination: AccountInfo = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("sol_destination"))?;
                if !AsRef::<AccountInfo>::as_ref(&account).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("account"),
                    );
                }
                {
                    let my_key = account.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("account")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                {
                    if account.key() == sol_destination.key() {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintClose,
                                )
                                .with_account_name("account"),
                        );
                    }
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                if !&sol_destination.is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("sol_destination"),
                    );
                }
                Ok(IdlCloseAccount {
                    account,
                    authority,
                    sol_destination,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCloseAccount<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.account.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos.extend(self.sol_destination.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlCloseAccount<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.account.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas.extend(self.sol_destination.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlCloseAccount<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                {
                    let sol_destination = &self.sol_destination;
                    anchor_lang::AccountsClose::close(
                            &self.account,
                            sol_destination.to_account_info(),
                        )
                        .map_err(|e| e.with_account_name("account"))?;
                }
                anchor_lang::AccountsExit::exit(&self.sol_destination, program_id)
                    .map_err(|e| e.with_account_name("sol_destination"))?;
                Ok(())
            }
        }
        pub struct IdlCloseAccountBumps {}
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlCloseAccountBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::write_str(f, "IdlCloseAccountBumps")
            }
        }
        impl Default for IdlCloseAccountBumps {
            fn default() -> Self {
                IdlCloseAccountBumps {}
            }
        }
        impl<'info> anchor_lang::Bumps for IdlCloseAccount<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlCloseAccountBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_close_account {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlCloseAccount`].
            pub struct IdlCloseAccount {
                pub account: Pubkey,
                pub authority: Pubkey,
                pub sol_destination: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlCloseAccount
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.account, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    borsh::BorshSerialize::serialize(&self.sol_destination, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlCloseAccount {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.account,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.sol_destination,
                                false,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_close_account {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlCloseAccount`].
            pub struct IdlCloseAccount<'info> {
                pub account: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub sol_destination: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlCloseAccount<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.account),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.sol_destination),
                                false,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCloseAccount<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.account),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.sol_destination,
                            ),
                        );
                    account_infos
                }
            }
        }
        use std::cell::{Ref, RefMut};
        pub trait IdlTrailingData<'info> {
            fn trailing_data(self) -> Ref<'info, [u8]>;
            fn trailing_data_mut(self) -> RefMut<'info, [u8]>;
        }
        impl<'a, 'info: 'a> IdlTrailingData<'a> for &'a Account<'info, IdlAccount> {
            fn trailing_data(self) -> Ref<'a, [u8]> {
                let info: &AccountInfo<'info> = self.as_ref();
                Ref::map(info.try_borrow_data().unwrap(), |d| &d[44..])
            }
            fn trailing_data_mut(self) -> RefMut<'a, [u8]> {
                let info: &AccountInfo<'info> = self.as_ref();
                RefMut::map(info.try_borrow_mut_data().unwrap(), |d| &mut d[44..])
            }
        }
        #[inline(never)]
        pub fn __idl_create_account(
            program_id: &Pubkey,
            accounts: &mut IdlCreateAccounts,
            data_len: u64,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlCreateAccount");
            if program_id != accounts.program.key {
                return Err(
                    anchor_lang::error::ErrorCode::IdlInstructionInvalidProgram.into(),
                );
            }
            let from = accounts.from.key;
            let (base, nonce) = Pubkey::find_program_address(&[], program_id);
            let seed = IdlAccount::seed();
            let owner = accounts.program.key;
            let to = Pubkey::create_with_seed(&base, seed, owner).unwrap();
            let space = std::cmp::min(
                IdlAccount::DISCRIMINATOR.len() + 32 + 4 + data_len as usize,
                10_000,
            );
            let rent = Rent::get()?;
            let lamports = rent.minimum_balance(space);
            let seeds = &[&[nonce][..]];
            let ix = anchor_lang::solana_program::system_instruction::create_account_with_seed(
                from,
                &to,
                &base,
                seed,
                lamports,
                space as u64,
                owner,
            );
            anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &[
                    accounts.from.clone(),
                    accounts.to.clone(),
                    accounts.base.clone(),
                    accounts.system_program.to_account_info(),
                ],
                &[seeds],
            )?;
            let mut idl_account = {
                let mut account_data = accounts.to.try_borrow_data()?;
                let mut account_data_slice: &[u8] = &account_data;
                IdlAccount::try_deserialize_unchecked(&mut account_data_slice)?
            };
            idl_account.authority = *accounts.from.key;
            let mut data = accounts.to.try_borrow_mut_data()?;
            let dst: &mut [u8] = &mut data;
            let mut cursor = std::io::Cursor::new(dst);
            idl_account.try_serialize(&mut cursor)?;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_resize_account(
            program_id: &Pubkey,
            accounts: &mut IdlResizeAccount,
            data_len: u64,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlResizeAccount");
            let data_len: usize = data_len as usize;
            if accounts.idl.data_len != 0 {
                return Err(anchor_lang::error::ErrorCode::IdlAccountNotEmpty.into());
            }
            let idl_ref = AsRef::<AccountInfo>::as_ref(&accounts.idl);
            let new_account_space = idl_ref
                .data_len()
                .checked_add(
                    std::cmp::min(
                        data_len
                            .checked_sub(idl_ref.data_len())
                            .expect(
                                "data_len should always be >= the current account space",
                            ),
                        10_000,
                    ),
                )
                .unwrap();
            if new_account_space > idl_ref.data_len() {
                let sysvar_rent = Rent::get()?;
                let new_rent_minimum = sysvar_rent.minimum_balance(new_account_space);
                anchor_lang::system_program::transfer(
                    anchor_lang::context::CpiContext::new(
                        accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: accounts.authority.to_account_info(),
                            to: accounts.idl.to_account_info(),
                        },
                    ),
                    new_rent_minimum.checked_sub(idl_ref.lamports()).unwrap(),
                )?;
                idl_ref.realloc(new_account_space, false)?;
            }
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_close_account(
            program_id: &Pubkey,
            accounts: &mut IdlCloseAccount,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlCloseAccount");
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_create_buffer(
            program_id: &Pubkey,
            accounts: &mut IdlCreateBuffer,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlCreateBuffer");
            let mut buffer = &mut accounts.buffer;
            buffer.authority = *accounts.authority.key;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_write(
            program_id: &Pubkey,
            accounts: &mut IdlAccounts,
            idl_data: Vec<u8>,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlWrite");
            let prev_len: usize = ::std::convert::TryInto::<
                usize,
            >::try_into(accounts.idl.data_len)
                .unwrap();
            let new_len: usize = prev_len.checked_add(idl_data.len()).unwrap() as usize;
            accounts
                .idl
                .data_len = accounts
                .idl
                .data_len
                .checked_add(
                    ::std::convert::TryInto::<u32>::try_into(idl_data.len()).unwrap(),
                )
                .unwrap();
            use IdlTrailingData;
            let mut idl_bytes = accounts.idl.trailing_data_mut();
            let idl_expansion = &mut idl_bytes[prev_len..new_len];
            if idl_expansion.len() != idl_data.len() {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                            error_name: anchor_lang::error::ErrorCode::RequireEqViolated
                                .name(),
                            error_code_number: anchor_lang::error::ErrorCode::RequireEqViolated
                                .into(),
                            error_msg: anchor_lang::error::ErrorCode::RequireEqViolated
                                .to_string(),
                            error_origin: Some(
                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                    filename: "programs/session-manager/src/lib.rs",
                                    line: 30u32,
                                }),
                            ),
                            compared_values: None,
                        })
                        .with_values((idl_expansion.len(), idl_data.len())),
                );
            }
            idl_expansion.copy_from_slice(&idl_data[..]);
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_set_authority(
            program_id: &Pubkey,
            accounts: &mut IdlAccounts,
            new_authority: Pubkey,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlSetAuthority");
            accounts.idl.authority = new_authority;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_set_buffer(
            program_id: &Pubkey,
            accounts: &mut IdlSetBuffer,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlSetBuffer");
            accounts.idl.data_len = accounts.buffer.data_len;
            use IdlTrailingData;
            let buffer_len = ::std::convert::TryInto::<
                usize,
            >::try_into(accounts.buffer.data_len)
                .unwrap();
            let mut target = accounts.idl.trailing_data_mut();
            let source = &accounts.buffer.trailing_data()[..buffer_len];
            if target.len() < buffer_len {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                            error_name: anchor_lang::error::ErrorCode::RequireGteViolated
                                .name(),
                            error_code_number: anchor_lang::error::ErrorCode::RequireGteViolated
                                .into(),
                            error_msg: anchor_lang::error::ErrorCode::RequireGteViolated
                                .to_string(),
                            error_origin: Some(
                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                    filename: "programs/session-manager/src/lib.rs",
                                    line: 30u32,
                                }),
                            ),
                            compared_values: None,
                        })
                        .with_values((target.len(), buffer_len)),
                );
            }
            target[..buffer_len].copy_from_slice(source);
            Ok(())
        }
    }
    /// __global mod defines wrapped handlers for global instructions.
    pub mod __global {
        use super::*;
        #[inline(never)]
        pub fn start_session<'info>(
            __program_id: &Pubkey,
            __accounts: &'info [AccountInfo<'info>],
            __ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: StartSession");
            let ix = instruction::StartSession::deserialize(&mut &__ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::StartSession = ix;
            let mut __bumps = <StartSession as anchor_lang::Bumps>::Bumps::default();
            let mut __reallocs = std::collections::BTreeSet::new();
            let mut __remaining_accounts: &[AccountInfo] = __accounts;
            let mut __accounts = StartSession::try_accounts(
                __program_id,
                &mut __remaining_accounts,
                __ix_data,
                &mut __bumps,
                &mut __reallocs,
            )?;
            let result = session_manager::start_session(
                anchor_lang::context::Context::new(
                    __program_id,
                    &mut __accounts,
                    __remaining_accounts,
                    __bumps,
                ),
            )?;
            __accounts.exit(__program_id)
        }
        #[inline(never)]
        pub fn revoke_session<'info>(
            __program_id: &Pubkey,
            __accounts: &'info [AccountInfo<'info>],
            __ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: RevokeSession");
            let ix = instruction::RevokeSession::deserialize(&mut &__ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::RevokeSession = ix;
            let mut __bumps = <RevokeSession as anchor_lang::Bumps>::Bumps::default();
            let mut __reallocs = std::collections::BTreeSet::new();
            let mut __remaining_accounts: &[AccountInfo] = __accounts;
            let mut __accounts = RevokeSession::try_accounts(
                __program_id,
                &mut __remaining_accounts,
                __ix_data,
                &mut __bumps,
                &mut __reallocs,
            )?;
            let result = session_manager::revoke_session(
                anchor_lang::context::Context::new(
                    __program_id,
                    &mut __accounts,
                    __remaining_accounts,
                    __bumps,
                ),
            )?;
            __accounts.exit(__program_id)
        }
        #[inline(never)]
        pub fn close_session<'info>(
            __program_id: &Pubkey,
            __accounts: &'info [AccountInfo<'info>],
            __ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: CloseSession");
            let ix = instruction::CloseSession::deserialize(&mut &__ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::CloseSession = ix;
            let mut __bumps = <CloseSession as anchor_lang::Bumps>::Bumps::default();
            let mut __reallocs = std::collections::BTreeSet::new();
            let mut __remaining_accounts: &[AccountInfo] = __accounts;
            let mut __accounts = CloseSession::try_accounts(
                __program_id,
                &mut __remaining_accounts,
                __ix_data,
                &mut __bumps,
                &mut __reallocs,
            )?;
            let result = session_manager::close_session(
                anchor_lang::context::Context::new(
                    __program_id,
                    &mut __accounts,
                    __remaining_accounts,
                    __bumps,
                ),
            )?;
            __accounts.exit(__program_id)
        }
    }
}
pub mod session_manager {
    use super::*;
    pub fn start_session<'info>(
        ctx: Context<'_, '_, '_, 'info, StartSession<'info>>,
    ) -> Result<()> {
        let Intent {
            signer,
            message: Message {
                version: Version { major, minor },
                chain_id,
                domain,
                expires,
                session_key,
                tokens,
                extra,
            },
        } = Intent::load(&ctx.accounts.sysvar_instructions)
            .map_err(Into::<SessionManagerError>::into)?;
        ctx.accounts.check_chain_id(chain_id)?;
        ctx.accounts.check_session_key(session_key)?;
        let expiration = clock::check_expiration(expires)?;
        let authorized_tokens_with_mints = match tokens {
            Tokens::Specific(tokens) => {
                let pending_approvals = convert_remaning_accounts_and_token_limits_to_pending_approvals(
                    ctx.remaining_accounts,
                    tokens,
                    &signer,
                )?;
                let authorized_tokens_with_mints = AuthorizedTokensWithMints::Specific(
                    pending_approvals.iter().map(|p| p.mint()).collect(),
                );
                ctx.accounts
                    .approve_tokens(pending_approvals, ctx.bumps.session_setter)?;
                authorized_tokens_with_mints
            }
            Tokens::All => AuthorizedTokensWithMints::All,
        };
        let program_domains = ctx.accounts.get_domain_programs(&domain)?;
        let session = match minor {
            1 => {
                Session {
                    sponsor: ctx.accounts.sponsor.key(),
                    major,
                    session_info: SessionInfo::V1(ActiveSessionInfo {
                        user: signer,
                        authorized_programs: AuthorizedPrograms::Specific(
                            program_domains,
                        ),
                        authorized_tokens: authorized_tokens_with_mints.as_ref().clone(),
                        extra: extra.into(),
                        expiration,
                    }),
                }
            }
            2 => {
                Session {
                    sponsor: ctx.accounts.sponsor.key(),
                    major,
                    session_info: SessionInfo::V2(
                        V2::Active(ActiveSessionInfo {
                            user: signer,
                            authorized_programs: AuthorizedPrograms::Specific(
                                program_domains,
                            ),
                            authorized_tokens: authorized_tokens_with_mints
                                .as_ref()
                                .clone(),
                            extra: extra.into(),
                            expiration,
                        }),
                    ),
                }
            }
            3 => {
                Session {
                    sponsor: ctx.accounts.sponsor.key(),
                    major,
                    session_info: SessionInfo::V3(
                        V3::Active(ActiveSessionInfo {
                            user: signer,
                            authorized_programs: AuthorizedPrograms::Specific(
                                program_domains,
                            ),
                            authorized_tokens: authorized_tokens_with_mints,
                            extra: extra.into(),
                            expiration,
                        }),
                    ),
                }
            }
            4 => {
                Session {
                    sponsor: ctx.accounts.sponsor.key(),
                    major,
                    session_info: SessionInfo::V4(
                        V4::Active(ActiveSessionInfoWithDomainHash {
                            domain_hash: domain.get_domain_hash(),
                            active_session_info: ActiveSessionInfo {
                                user: signer,
                                authorized_programs: AuthorizedPrograms::Specific(
                                    program_domains,
                                ),
                                authorized_tokens: authorized_tokens_with_mints,
                                extra: extra.into(),
                                expiration,
                            },
                        }),
                    ),
                }
            }
            _ => {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: SessionManagerError::InvalidVersion.name(),
                        error_code_number: SessionManagerError::InvalidVersion.into(),
                        error_msg: SessionManagerError::InvalidVersion.to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/session-manager/src/lib.rs",
                                line: 125u32,
                            }),
                        ),
                        compared_values: None,
                    }),
                );
            }
        };
        ctx.accounts.initialize_and_store_session(&session)?;
        Ok(())
    }
    pub fn revoke_session<'info>(
        ctx: Context<'_, '_, '_, 'info, RevokeSession<'info>>,
    ) -> Result<()> {
        match &ctx.accounts.session.session_info {
            SessionInfo::Invalid => {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: SessionManagerError::InvalidVersion.name(),
                        error_code_number: SessionManagerError::InvalidVersion.into(),
                        error_msg: SessionManagerError::InvalidVersion.to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/session-manager/src/lib.rs",
                                line: 136u32,
                            }),
                        ),
                        compared_values: None,
                    }),
                );
            }
            SessionInfo::V1(_) => {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: SessionManagerError::InvalidVersion.name(),
                        error_code_number: SessionManagerError::InvalidVersion.into(),
                        error_msg: SessionManagerError::InvalidVersion.to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/session-manager/src/lib.rs",
                                line: 137u32,
                            }),
                        ),
                        compared_values: None,
                    }),
                );
            }
            SessionInfo::V2(V2::Active(active_session_info)) => {
                ctx
                    .accounts
                    .session
                    .session_info = SessionInfo::V2(
                    V2::Revoked(active_session_info.expiration),
                );
            }
            SessionInfo::V2(V2::Revoked(_)) => {}
            SessionInfo::V3(V3::Active(active_session_info)) => {
                ctx
                    .accounts
                    .session
                    .session_info = SessionInfo::V3(
                    V3::Revoked(RevokedSessionInfo {
                        user: active_session_info.user,
                        expiration: active_session_info.expiration,
                        authorized_tokens_with_mints: active_session_info
                            .authorized_tokens
                            .clone(),
                    }),
                );
            }
            SessionInfo::V3(V3::Revoked(_)) => {}
            SessionInfo::V4(V4::Active(active_session_info)) => {
                ctx
                    .accounts
                    .session
                    .session_info = SessionInfo::V4(
                    V4::Revoked(RevokedSessionInfo {
                        user: active_session_info.as_ref().user,
                        expiration: active_session_info.as_ref().expiration,
                        authorized_tokens_with_mints: active_session_info
                            .as_ref()
                            .authorized_tokens
                            .clone(),
                    }),
                );
            }
            SessionInfo::V4(V4::Revoked(_)) => {}
        }
        ctx.accounts.reallocate_and_refund_rent()?;
        Ok(())
    }
    pub fn close_session<'info>(
        ctx: Context<'_, '_, '_, 'info, CloseSession<'info>>,
    ) -> Result<()> {
        let (user, mints_to_revoke) = match &ctx.accounts.session.session_info {
            SessionInfo::V3(
                V3::Active(
                    ActiveSessionInfo {
                        authorized_tokens: authorized_tokens_with_mints,
                        user,
                        ..
                    },
                ),
            )
            | SessionInfo::V3(
                V3::Revoked(
                    RevokedSessionInfo { authorized_tokens_with_mints, user, .. },
                ),
            )
            | SessionInfo::V4(
                V4::Active(
                    ActiveSessionInfoWithDomainHash {
                        active_session_info: ActiveSessionInfo {
                            authorized_tokens: authorized_tokens_with_mints,
                            user,
                            ..
                        },
                        ..
                    },
                ),
            )
            | SessionInfo::V4(
                V4::Revoked(
                    RevokedSessionInfo { authorized_tokens_with_mints, user, .. },
                ),
            ) => {
                match &authorized_tokens_with_mints {
                    AuthorizedTokensWithMints::Specific(mints) => (user, mints),
                    AuthorizedTokensWithMints::All => (user, &::alloc::vec::Vec::new()),
                }
            }
            SessionInfo::V2(V2::Active(active_session_info))
            | SessionInfo::V1(active_session_info) => {
                match active_session_info.authorized_tokens {
                    AuthorizedTokens::Specific => {
                        return Err(
                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                error_name: SessionManagerError::InvalidVersion.name(),
                                error_code_number: SessionManagerError::InvalidVersion
                                    .into(),
                                error_msg: SessionManagerError::InvalidVersion.to_string(),
                                error_origin: Some(
                                    anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                        filename: "programs/session-manager/src/lib.rs",
                                        line: 206u32,
                                    }),
                                ),
                                compared_values: None,
                            }),
                        );
                    }
                    AuthorizedTokens::All => {
                        (&active_session_info.user, &::alloc::vec::Vec::new())
                    }
                }
            }
            SessionInfo::V2(V2::Revoked(_)) | SessionInfo::Invalid => {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: SessionManagerError::InvalidVersion.name(),
                        error_code_number: SessionManagerError::InvalidVersion.into(),
                        error_msg: SessionManagerError::InvalidVersion.to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/session-manager/src/lib.rs",
                                line: 211u32,
                            }),
                        ),
                        compared_values: None,
                    }),
                );
            }
        };
        let pending_revocations = convert_remaining_accounts_and_mints_to_revoke_to_pending_revocations(
            ctx.remaining_accounts,
            mints_to_revoke,
            user,
            &ctx.accounts.session.key(),
        )?;
        ctx.accounts.revoke_tokens(pending_revocations, ctx.bumps.session_setter)?;
        Ok(())
    }
}
/// An Anchor generated module containing the program's set of
/// instructions, where each method handler in the `#[program]` mod is
/// associated with a struct defining the input arguments to the
/// method. These should be used directly, when one wants to serialize
/// Anchor instruction data, for example, when speciying
/// instructions on a client.
pub mod instruction {
    use super::*;
    /// Instruction.
    pub struct StartSession;
    impl borsh::ser::BorshSerialize for StartSession {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for StartSession {
        fn deserialize_reader<R: borsh::maybestd::io::Read>(
            reader: &mut R,
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::Discriminator for StartSession {
        const DISCRIMINATOR: &'static [u8] = &[0];
    }
    impl anchor_lang::InstructionData for StartSession {}
    impl anchor_lang::Owner for StartSession {
        fn owner() -> Pubkey {
            ID
        }
    }
    /// Instruction.
    pub struct RevokeSession;
    impl borsh::ser::BorshSerialize for RevokeSession {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for RevokeSession {
        fn deserialize_reader<R: borsh::maybestd::io::Read>(
            reader: &mut R,
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::Discriminator for RevokeSession {
        const DISCRIMINATOR: &'static [u8] = &[1];
    }
    impl anchor_lang::InstructionData for RevokeSession {}
    impl anchor_lang::Owner for RevokeSession {
        fn owner() -> Pubkey {
            ID
        }
    }
    /// Instruction.
    pub struct CloseSession;
    impl borsh::ser::BorshSerialize for CloseSession {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for CloseSession {
        fn deserialize_reader<R: borsh::maybestd::io::Read>(
            reader: &mut R,
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::Discriminator for CloseSession {
        const DISCRIMINATOR: &'static [u8] = &[2];
    }
    impl anchor_lang::InstructionData for CloseSession {}
    impl anchor_lang::Owner for CloseSession {
        fn owner() -> Pubkey {
            ID
        }
    }
}
/// An Anchor generated module, providing a set of structs
/// mirroring the structs deriving `Accounts`, where each field is
/// a `Pubkey`. This is useful for specifying accounts for a client.
pub mod accounts {
    pub use crate::__client_accounts_close_session::*;
    pub use crate::__client_accounts_start_session::*;
    pub use crate::__client_accounts_revoke_session::*;
}
pub struct StartSession<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,
    #[account(seeds = [chain_id::SEED], seeds::program = chain_id::ID, bump)]
    pub chain_id: Account<'info, chain_id::ChainId>,
    #[account(mut)]
    pub session: Signer<'info>,
    /// CHECK: we check the address of this account
    #[account(address = instructions::ID)]
    pub sysvar_instructions: AccountInfo<'info>,
    /// CHECK: We will do the checks in the function in `get_domain_programs`
    pub domain_registry: AccountInfo<'info>,
    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [SESSION_SETTER_SEED], bump)]
    pub session_setter: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
#[automatically_derived]
impl<'info> anchor_lang::Accounts<'info, StartSessionBumps> for StartSession<'info>
where
    'info: 'info,
{
    #[inline(never)]
    fn try_accounts(
        __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >],
        __ix_data: &[u8],
        __bumps: &mut StartSessionBumps,
        __reallocs: &mut std::collections::BTreeSet<
            anchor_lang::solana_program::pubkey::Pubkey,
        >,
    ) -> anchor_lang::Result<Self> {
        let sponsor: Signer = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("sponsor"))?;
        let chain_id: anchor_lang::accounts::account::Account<chain_id::ChainId> = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("chain_id"))?;
        let session: Signer = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("session"))?;
        let sysvar_instructions: AccountInfo = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("sysvar_instructions"))?;
        let domain_registry: AccountInfo = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("domain_registry"))?;
        let session_setter: AccountInfo = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("session_setter"))?;
        let token_program: anchor_lang::accounts::program::Program<Token> = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("token_program"))?;
        let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("system_program"))?;
        if !AsRef::<AccountInfo>::as_ref(&sponsor).is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("sponsor"),
            );
        }
        let (__pda_address, __bump) = Pubkey::find_program_address(
            &[chain_id::SEED],
            &chain_id::ID.key(),
        );
        __bumps.chain_id = __bump;
        if chain_id.key() != __pda_address {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintSeeds,
                    )
                    .with_account_name("chain_id")
                    .with_pubkeys((chain_id.key(), __pda_address)),
            );
        }
        if !AsRef::<AccountInfo>::as_ref(&session).is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("session"),
            );
        }
        {
            let actual = sysvar_instructions.key();
            let expected = instructions::ID;
            if actual != expected {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintAddress,
                        )
                        .with_account_name("sysvar_instructions")
                        .with_pubkeys((actual, expected)),
                );
            }
        }
        let (__pda_address, __bump) = Pubkey::find_program_address(
            &[SESSION_SETTER_SEED],
            &__program_id,
        );
        __bumps.session_setter = __bump;
        if session_setter.key() != __pda_address {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintSeeds,
                    )
                    .with_account_name("session_setter")
                    .with_pubkeys((session_setter.key(), __pda_address)),
            );
        }
        Ok(StartSession {
            sponsor,
            chain_id,
            session,
            sysvar_instructions,
            domain_registry,
            session_setter,
            token_program,
            system_program,
        })
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for StartSession<'info>
where
    'info: 'info,
{
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = ::alloc::vec::Vec::new();
        account_infos.extend(self.sponsor.to_account_infos());
        account_infos.extend(self.chain_id.to_account_infos());
        account_infos.extend(self.session.to_account_infos());
        account_infos.extend(self.sysvar_instructions.to_account_infos());
        account_infos.extend(self.domain_registry.to_account_infos());
        account_infos.extend(self.session_setter.to_account_infos());
        account_infos.extend(self.token_program.to_account_infos());
        account_infos.extend(self.system_program.to_account_infos());
        account_infos
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for StartSession<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = ::alloc::vec::Vec::new();
        account_metas.extend(self.sponsor.to_account_metas(None));
        account_metas.extend(self.chain_id.to_account_metas(None));
        account_metas.extend(self.session.to_account_metas(None));
        account_metas.extend(self.sysvar_instructions.to_account_metas(None));
        account_metas.extend(self.domain_registry.to_account_metas(None));
        account_metas.extend(self.session_setter.to_account_metas(None));
        account_metas.extend(self.token_program.to_account_metas(None));
        account_metas.extend(self.system_program.to_account_metas(None));
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::AccountsExit<'info> for StartSession<'info>
where
    'info: 'info,
{
    fn exit(
        &self,
        program_id: &anchor_lang::solana_program::pubkey::Pubkey,
    ) -> anchor_lang::Result<()> {
        anchor_lang::AccountsExit::exit(&self.sponsor, program_id)
            .map_err(|e| e.with_account_name("sponsor"))?;
        anchor_lang::AccountsExit::exit(&self.session, program_id)
            .map_err(|e| e.with_account_name("session"))?;
        Ok(())
    }
}
pub struct StartSessionBumps {
    pub chain_id: u8,
    pub session_setter: u8,
}
#[automatically_derived]
impl ::core::fmt::Debug for StartSessionBumps {
    #[inline]
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::debug_struct_field2_finish(
            f,
            "StartSessionBumps",
            "chain_id",
            &self.chain_id,
            "session_setter",
            &&self.session_setter,
        )
    }
}
impl Default for StartSessionBumps {
    fn default() -> Self {
        StartSessionBumps {
            chain_id: u8::MAX,
            session_setter: u8::MAX,
        }
    }
}
impl<'info> anchor_lang::Bumps for StartSession<'info>
where
    'info: 'info,
{
    type Bumps = StartSessionBumps;
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a struct for a given
/// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
/// instead of an `AccountInfo`. This is useful for clients that want
/// to generate a list of accounts, without explicitly knowing the
/// order all the fields should be in.
///
/// To access the struct in this module, one should use the sibling
/// `accounts` module (also generated), which re-exports this.
pub(crate) mod __client_accounts_start_session {
    use super::*;
    use anchor_lang::prelude::borsh;
    /// Generated client accounts for [`StartSession`].
    pub struct StartSession {
        pub sponsor: Pubkey,
        pub chain_id: Pubkey,
        pub session: Pubkey,
        pub sysvar_instructions: Pubkey,
        pub domain_registry: Pubkey,
        pub session_setter: Pubkey,
        pub token_program: Pubkey,
        pub system_program: Pubkey,
    }
    impl borsh::ser::BorshSerialize for StartSession
    where
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.sponsor, writer)?;
            borsh::BorshSerialize::serialize(&self.chain_id, writer)?;
            borsh::BorshSerialize::serialize(&self.session, writer)?;
            borsh::BorshSerialize::serialize(&self.sysvar_instructions, writer)?;
            borsh::BorshSerialize::serialize(&self.domain_registry, writer)?;
            borsh::BorshSerialize::serialize(&self.session_setter, writer)?;
            borsh::BorshSerialize::serialize(&self.token_program, writer)?;
            borsh::BorshSerialize::serialize(&self.system_program, writer)?;
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::ToAccountMetas for StartSession {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.sponsor,
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.chain_id,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.session,
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.sysvar_instructions,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.domain_registry,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.session_setter,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.token_program,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.system_program,
                        false,
                    ),
                );
            account_metas
        }
    }
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a CPI struct for a given
/// `#[derive(Accounts)]` implementation, where each field is an
/// AccountInfo.
///
/// To access the struct in this module, one should use the sibling
/// [`cpi::accounts`] module (also generated), which re-exports this.
pub(crate) mod __cpi_client_accounts_start_session {
    use super::*;
    /// Generated CPI struct of the accounts for [`StartSession`].
    pub struct StartSession<'info> {
        pub sponsor: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub chain_id: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub session: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub sysvar_instructions: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
        pub domain_registry: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
        pub session_setter: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
        pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for StartSession<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.sponsor),
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.chain_id),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.session),
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.sysvar_instructions),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.domain_registry),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.session_setter),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.token_program),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.system_program),
                        false,
                    ),
                );
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for StartSession<'info> {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.sponsor));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.chain_id));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.session));
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(
                        &self.sysvar_instructions,
                    ),
                );
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.domain_registry),
                );
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.session_setter),
                );
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.token_program),
                );
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.system_program),
                );
            account_infos
        }
    }
}
pub struct RevokeSession<'info> {
    #[account(mut, signer)]
    pub session: Account<'info, Session>,
    /// CHECK: we check it against the session's sponsor
    #[account(
        mut,
        constraint = session.sponsor = = sponsor.key(

        )@SessionManagerError::SponsorMismatch
    )]
    pub sponsor: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
#[automatically_derived]
impl<'info> anchor_lang::Accounts<'info, RevokeSessionBumps> for RevokeSession<'info>
where
    'info: 'info,
{
    #[inline(never)]
    fn try_accounts(
        __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >],
        __ix_data: &[u8],
        __bumps: &mut RevokeSessionBumps,
        __reallocs: &mut std::collections::BTreeSet<
            anchor_lang::solana_program::pubkey::Pubkey,
        >,
    ) -> anchor_lang::Result<Self> {
        let session: anchor_lang::accounts::account::Account<Session> = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("session"))?;
        let sponsor: AccountInfo = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("sponsor"))?;
        let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("system_program"))?;
        if !AsRef::<AccountInfo>::as_ref(&session).is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("session"),
            );
        }
        if !AsRef::<AccountInfo>::as_ref(&session).is_signer {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintSigner,
                    )
                    .with_account_name("session"),
            );
        }
        if !&sponsor.is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("sponsor"),
            );
        }
        if !(session.sponsor == sponsor.key()) {
            return Err(
                anchor_lang::error::Error::from(SessionManagerError::SponsorMismatch)
                    .with_account_name("sponsor"),
            );
        }
        Ok(RevokeSession {
            session,
            sponsor,
            system_program,
        })
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for RevokeSession<'info>
where
    'info: 'info,
{
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = ::alloc::vec::Vec::new();
        account_infos.extend(self.session.to_account_infos());
        account_infos.extend(self.sponsor.to_account_infos());
        account_infos.extend(self.system_program.to_account_infos());
        account_infos
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for RevokeSession<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = ::alloc::vec::Vec::new();
        account_metas.extend(self.session.to_account_metas(Some(true)));
        account_metas.extend(self.sponsor.to_account_metas(None));
        account_metas.extend(self.system_program.to_account_metas(None));
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::AccountsExit<'info> for RevokeSession<'info>
where
    'info: 'info,
{
    fn exit(
        &self,
        program_id: &anchor_lang::solana_program::pubkey::Pubkey,
    ) -> anchor_lang::Result<()> {
        anchor_lang::AccountsExit::exit(&self.session, program_id)
            .map_err(|e| e.with_account_name("session"))?;
        anchor_lang::AccountsExit::exit(&self.sponsor, program_id)
            .map_err(|e| e.with_account_name("sponsor"))?;
        Ok(())
    }
}
pub struct RevokeSessionBumps {}
#[automatically_derived]
impl ::core::fmt::Debug for RevokeSessionBumps {
    #[inline]
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::write_str(f, "RevokeSessionBumps")
    }
}
impl Default for RevokeSessionBumps {
    fn default() -> Self {
        RevokeSessionBumps {}
    }
}
impl<'info> anchor_lang::Bumps for RevokeSession<'info>
where
    'info: 'info,
{
    type Bumps = RevokeSessionBumps;
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a struct for a given
/// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
/// instead of an `AccountInfo`. This is useful for clients that want
/// to generate a list of accounts, without explicitly knowing the
/// order all the fields should be in.
///
/// To access the struct in this module, one should use the sibling
/// `accounts` module (also generated), which re-exports this.
pub(crate) mod __client_accounts_revoke_session {
    use super::*;
    use anchor_lang::prelude::borsh;
    /// Generated client accounts for [`RevokeSession`].
    pub struct RevokeSession {
        pub session: Pubkey,
        pub sponsor: Pubkey,
        pub system_program: Pubkey,
    }
    impl borsh::ser::BorshSerialize for RevokeSession
    where
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.session, writer)?;
            borsh::BorshSerialize::serialize(&self.sponsor, writer)?;
            borsh::BorshSerialize::serialize(&self.system_program, writer)?;
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::ToAccountMetas for RevokeSession {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.session,
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.sponsor,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.system_program,
                        false,
                    ),
                );
            account_metas
        }
    }
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a CPI struct for a given
/// `#[derive(Accounts)]` implementation, where each field is an
/// AccountInfo.
///
/// To access the struct in this module, one should use the sibling
/// [`cpi::accounts`] module (also generated), which re-exports this.
pub(crate) mod __cpi_client_accounts_revoke_session {
    use super::*;
    /// Generated CPI struct of the accounts for [`RevokeSession`].
    pub struct RevokeSession<'info> {
        pub session: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub sponsor: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for RevokeSession<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.session),
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.sponsor),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.system_program),
                        false,
                    ),
                );
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for RevokeSession<'info> {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.session));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.sponsor));
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.system_program),
                );
            account_infos
        }
    }
}
pub struct CloseSession<'info> {
    #[account(
        mut,
        close = sponsor,
        constraint = !session.is_live()?@SessionManagerError::SessionIsLive
    )]
    pub session: Account<'info, Session>,
    #[account(
        constraint = session.sponsor = = sponsor.key(

        )@SessionManagerError::SponsorMismatch
    )]
    /// CHECK: we check it against the session's sponsor
    #[account(mut)]
    pub sponsor: AccountInfo<'info>,
    /// CHECK: this is just a signer for token program CPIs
    #[account(seeds = [SESSION_SETTER_SEED], bump)]
    pub session_setter: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
#[automatically_derived]
impl<'info> anchor_lang::Accounts<'info, CloseSessionBumps> for CloseSession<'info>
where
    'info: 'info,
{
    #[inline(never)]
    fn try_accounts(
        __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >],
        __ix_data: &[u8],
        __bumps: &mut CloseSessionBumps,
        __reallocs: &mut std::collections::BTreeSet<
            anchor_lang::solana_program::pubkey::Pubkey,
        >,
    ) -> anchor_lang::Result<Self> {
        let session: anchor_lang::accounts::account::Account<Session> = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("session"))?;
        let sponsor: AccountInfo = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("sponsor"))?;
        let session_setter: AccountInfo = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("session_setter"))?;
        let token_program: anchor_lang::accounts::program::Program<Token> = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("token_program"))?;
        let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                __program_id,
                __accounts,
                __ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("system_program"))?;
        if !AsRef::<AccountInfo>::as_ref(&session).is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("session"),
            );
        }
        if !(!session.is_live()?) {
            return Err(
                anchor_lang::error::Error::from(SessionManagerError::SessionIsLive)
                    .with_account_name("session"),
            );
        }
        {
            if session.key() == sponsor.key() {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintClose,
                        )
                        .with_account_name("session"),
                );
            }
        }
        if !&sponsor.is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("sponsor"),
            );
        }
        if !(session.sponsor == sponsor.key()) {
            return Err(
                anchor_lang::error::Error::from(SessionManagerError::SponsorMismatch)
                    .with_account_name("sponsor"),
            );
        }
        let (__pda_address, __bump) = Pubkey::find_program_address(
            &[SESSION_SETTER_SEED],
            &__program_id,
        );
        __bumps.session_setter = __bump;
        if session_setter.key() != __pda_address {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintSeeds,
                    )
                    .with_account_name("session_setter")
                    .with_pubkeys((session_setter.key(), __pda_address)),
            );
        }
        Ok(CloseSession {
            session,
            sponsor,
            session_setter,
            token_program,
            system_program,
        })
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for CloseSession<'info>
where
    'info: 'info,
{
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = ::alloc::vec::Vec::new();
        account_infos.extend(self.session.to_account_infos());
        account_infos.extend(self.sponsor.to_account_infos());
        account_infos.extend(self.session_setter.to_account_infos());
        account_infos.extend(self.token_program.to_account_infos());
        account_infos.extend(self.system_program.to_account_infos());
        account_infos
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for CloseSession<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = ::alloc::vec::Vec::new();
        account_metas.extend(self.session.to_account_metas(None));
        account_metas.extend(self.sponsor.to_account_metas(None));
        account_metas.extend(self.session_setter.to_account_metas(None));
        account_metas.extend(self.token_program.to_account_metas(None));
        account_metas.extend(self.system_program.to_account_metas(None));
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::AccountsExit<'info> for CloseSession<'info>
where
    'info: 'info,
{
    fn exit(
        &self,
        program_id: &anchor_lang::solana_program::pubkey::Pubkey,
    ) -> anchor_lang::Result<()> {
        {
            let sponsor = &self.sponsor;
            anchor_lang::AccountsClose::close(&self.session, sponsor.to_account_info())
                .map_err(|e| e.with_account_name("session"))?;
        }
        anchor_lang::AccountsExit::exit(&self.sponsor, program_id)
            .map_err(|e| e.with_account_name("sponsor"))?;
        Ok(())
    }
}
pub struct CloseSessionBumps {
    pub session_setter: u8,
}
#[automatically_derived]
impl ::core::fmt::Debug for CloseSessionBumps {
    #[inline]
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::debug_struct_field1_finish(
            f,
            "CloseSessionBumps",
            "session_setter",
            &&self.session_setter,
        )
    }
}
impl Default for CloseSessionBumps {
    fn default() -> Self {
        CloseSessionBumps {
            session_setter: u8::MAX,
        }
    }
}
impl<'info> anchor_lang::Bumps for CloseSession<'info>
where
    'info: 'info,
{
    type Bumps = CloseSessionBumps;
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a struct for a given
/// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
/// instead of an `AccountInfo`. This is useful for clients that want
/// to generate a list of accounts, without explicitly knowing the
/// order all the fields should be in.
///
/// To access the struct in this module, one should use the sibling
/// `accounts` module (also generated), which re-exports this.
pub(crate) mod __client_accounts_close_session {
    use super::*;
    use anchor_lang::prelude::borsh;
    /// Generated client accounts for [`CloseSession`].
    pub struct CloseSession {
        pub session: Pubkey,
        pub sponsor: Pubkey,
        pub session_setter: Pubkey,
        pub token_program: Pubkey,
        pub system_program: Pubkey,
    }
    impl borsh::ser::BorshSerialize for CloseSession
    where
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.session, writer)?;
            borsh::BorshSerialize::serialize(&self.sponsor, writer)?;
            borsh::BorshSerialize::serialize(&self.session_setter, writer)?;
            borsh::BorshSerialize::serialize(&self.token_program, writer)?;
            borsh::BorshSerialize::serialize(&self.system_program, writer)?;
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::ToAccountMetas for CloseSession {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.session,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.sponsor,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.session_setter,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.token_program,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.system_program,
                        false,
                    ),
                );
            account_metas
        }
    }
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a CPI struct for a given
/// `#[derive(Accounts)]` implementation, where each field is an
/// AccountInfo.
///
/// To access the struct in this module, one should use the sibling
/// [`cpi::accounts`] module (also generated), which re-exports this.
pub(crate) mod __cpi_client_accounts_close_session {
    use super::*;
    /// Generated CPI struct of the accounts for [`CloseSession`].
    pub struct CloseSession<'info> {
        pub session: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub sponsor: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub session_setter: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
        pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for CloseSession<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.session),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.sponsor),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.session_setter),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.token_program),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.system_program),
                        false,
                    ),
                );
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for CloseSession<'info> {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.session));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.sponsor));
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.session_setter),
                );
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.token_program),
                );
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.system_program),
                );
            account_infos
        }
    }
}
impl<'info> StartSession<'info> {
    pub fn initialize_and_store_session(&self, session: &Session) -> Result<()> {
        system_program::initialize_account(
            &self.sponsor,
            &self.session,
            &self.system_program,
            &crate::ID,
            &Rent::get()?,
            8 + get_instance_packed_len(&session)? as u64,
        )?;
        let mut data = self.session.try_borrow_mut_data()?;
        let dst: &mut [u8] = &mut data;
        let mut writer = anchor_lang::__private::BpfWriter::new(dst);
        session.try_serialize(&mut writer)?;
        Ok(())
    }
    pub fn check_session_key(&self, session_key: Pubkey) -> Result<()> {
        if self.session.key() != session_key {
            return Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                    error_name: SessionManagerError::SessionKeyMismatch.name(),
                    error_code_number: SessionManagerError::SessionKeyMismatch.into(),
                    error_msg: SessionManagerError::SessionKeyMismatch.to_string(),
                    error_origin: Some(
                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                            filename: "programs/session-manager/src/lib.rs",
                            line: 293u32,
                        }),
                    ),
                    compared_values: None,
                }),
            );
        }
        Ok(())
    }
    pub fn check_chain_id(&self, chain_id: String) -> Result<()> {
        if self.chain_id.chain_id != chain_id {
            return Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                    error_name: SessionManagerError::ChainIdMismatch.name(),
                    error_code_number: SessionManagerError::ChainIdMismatch.into(),
                    error_msg: SessionManagerError::ChainIdMismatch.to_string(),
                    error_origin: Some(
                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                            filename: "programs/session-manager/src/lib.rs",
                            line: 300u32,
                        }),
                    ),
                    compared_values: None,
                }),
            );
        }
        Ok(())
    }
    pub fn get_domain_programs(
        &self,
        domain: &Domain,
    ) -> Result<Vec<AuthorizedProgram>> {
        if self.domain_registry.key() != domain.get_domain_record_address() {
            return Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: SessionManagerError::DomainRecordMismatch.name(),
                        error_code_number: SessionManagerError::DomainRecordMismatch
                            .into(),
                        error_msg: SessionManagerError::DomainRecordMismatch.to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/session-manager/src/lib.rs",
                                line: 306u32,
                            }),
                        ),
                        compared_values: None,
                    })
                    .with_values((
                        self.domain_registry.key(),
                        domain.get_domain_record_address(),
                    )),
            );
        }
        let domain_record = DomainRecordInner::load(
            self.domain_registry.to_account_info(),
            self.sponsor.to_account_info(),
        );
        domain_record.to_vec::<AuthorizedProgram>()
    }
}
impl<'info> RevokeSession<'info> {
    pub fn reallocate_and_refund_rent(&self) -> Result<()> {
        let new_len = 8 + get_instance_packed_len::<Session>(&self.session)?;
        self.session.to_account_info().realloc(new_len, false)?;
        let new_rent = Rent::get()?.minimum_balance(new_len);
        let current_rent = self.session.to_account_info().lamports();
        if new_rent < current_rent {
            **self.session.to_account_info().try_borrow_mut_lamports()? = new_rent;
            **self
                .sponsor
                .try_borrow_mut_lamports()? = self
                .sponsor
                .lamports()
                .checked_add(current_rent.saturating_sub(new_rent))
                .ok_or(ProgramError::ArithmeticOverflow)?;
        }
        Ok(())
    }
}
