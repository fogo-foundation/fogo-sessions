use anchor_lang::prelude::Pubkey;
use chrono::{DateTime, FixedOffset};
use domain_registry::domain::Domain;
use fogo_sessions_sdk::session::MAJOR;
use nom::lib::std::fmt::Debug;
use nom::{
    bytes::complete::tag,
    character::complete::line_ending,
    combinator::{map, map_opt, map_res},
    error::{Error, ParseError},
    multi::many1,
    sequence::preceded,
    AsChar, Compare, Err, IResult, Input, Offset, ParseTo, Parser,
};
use solana_intents::{key_value, SymbolOrMint, Version};
use std::{collections::HashMap, str::FromStr};

const MESSAGE_PREFIX: &str = "Fogo Sessions:\nSigning this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.\n";
const UNLIMITED_TOKEN_PERMISSIONS_VALUE: &str = "this app may spend any amount of any token";
const TOKENLESS_PERMISSIONS_VALUE: &str = "this app may not spend any tokens";

#[derive(Debug, PartialEq)]
pub struct Message {
    pub version: Version,
    pub chain_id: String,
    pub domain: Domain,
    pub expires: DateTime<FixedOffset>,
    pub session_key: Pubkey,
    pub tokens: Tokens,
    pub extra: HashMap<String, String>,
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
{
    map_opt(
        preceded((tag(MESSAGE_PREFIX), line_ending::<I, E>), many1(key_value)),
        |values| {
            let mut values = values
                .into_iter()
                .map(|(key, value)| key.parse_to().map(|key| (key, value)))
                .collect::<Option<HashMap<String, String>>>()?;
            let version: Version = values.remove("version")?.parse().ok()?;
            if version.major == MAJOR {
                Some(Message {
                    version,
                    chain_id: values.remove("chain_id")?,
                    domain: Domain::new_checked(&values.remove("domain")?).ok()?,
                    expires: values.remove("expires")?.parse().ok()?,
                    session_key: values.remove("session_key")?.parse().ok()?,
                    tokens: values.remove("tokens")?.parse().ok()?,
                    extra: values,
                })
            } else {
                None
            }
        },
    )
    .parse(input)
}

#[derive(Debug, PartialEq)]
pub enum Tokens {
    Specific(Vec<(SymbolOrMint, String)>),
    All,
}

impl FromStr for Tokens {
    type Err = Err<Error<String>>;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            UNLIMITED_TOKEN_PERMISSIONS_VALUE => Ok(Tokens::All),
            TOKENLESS_PERMISSIONS_VALUE => Ok(Tokens::Specific(vec![])),
            _ => map(
                many1(map_res(
                    preceded(tag("-"), key_value),
                    |(key, value): (&str, String)| key.parse().map(|token| (token, value)),
                )),
                Tokens::Specific,
            )
            .parse(s)
            .map(|(_, tokens)| tokens)
            .map_err(Err::<Error<&str>>::to_owned),
        }
    }
}

#[cfg(test)]
mod tests {
    mod tokens {
        use super::super::*;

        #[test]
        fn test_unlimited() {
            assert_eq!(
                "this app may spend any amount of any token"
                    .parse::<Tokens>()
                    .unwrap(),
                Tokens::All
            )
        }

        #[test]
        fn test_tokenless() {
            assert_eq!(
                "this app may not spend any tokens"
                    .parse::<Tokens>()
                    .unwrap(),
                Tokens::Specific(vec![])
            )
        }

        #[test]
        fn test_specific() {
            assert_eq!(
                "-foo: 5467.672\n-So11111111111111111111111111111111111111112: 766"
                    .parse::<Tokens>()
                    .unwrap(),
                Tokens::Specific(vec![
                    (
                        SymbolOrMint::Symbol("foo".to_string()),
                        "5467.672".to_string()
                    ),
                    (
                        SymbolOrMint::Mint(
                            Pubkey::from_str("So11111111111111111111111111111111111111112")
                                .unwrap()
                        ),
                        "766".to_string()
                    )
                ])
            )
        }
    }

    mod message {
        use super::super::*;
        use indoc::{formatdoc, indoc};

        #[test]
        fn test_parse() {
            let message = indoc! {"
                Fogo Sessions:
                Signing this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.

                version: 0.1
                chain_id: localnet
                domain: http://localhost:3000
                expires: 2025-07-17T17:30:15.033Z
                session_key: AnDvGGfeXStwG8pfmp98nodbcdeYGNz8r6fPxjrvJxK5
                tokens: this app may spend any amount of any token"};

            assert_eq!(
                TryInto::<Message>::try_into(message.as_bytes().to_vec()).unwrap(),
                Message {
                    version: Version { major: 0, minor: 1 },
                    chain_id: "localnet".to_string(),
                    domain: Domain::new_checked("http://localhost:3000").unwrap(),
                    expires: DateTime::parse_from_rfc3339("2025-07-17T17:30:15.033Z").unwrap(),
                    session_key: Pubkey::from_str("AnDvGGfeXStwG8pfmp98nodbcdeYGNz8r6fPxjrvJxK5")
                        .unwrap(),
                    tokens: Tokens::All,
                    extra: HashMap::new()
                }
            );
        }

        #[test]
        pub fn test_parse_message() {
            let message = indoc!(
                "Fogo Sessions:
                Signing this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.
                
                version: 0.1
                chain_id: localnet
                domain: https://app.xyz
                expires: 2014-11-28T21:00:09+09:00
                session_key: 2jKr1met2kCteHoTNtkTL51Sgw7rQKcF4YNdP5xfkPRB
                tokens:
                -SOL: 100
                -DFVMuhuS4hBfXsJE18EGVX9k75QMycUBNNLJi5bwADnu: 200
                key1: value1
                key2: value2");
            assert_eq!(
                TryInto::<Message>::try_into(message.as_bytes().to_vec()).unwrap(),
                Message {
                    version: Version { major: 0, minor: 1 },
                    chain_id: "localnet".to_string(),
                    domain: Domain::new_checked("https://app.xyz").unwrap(),
                    expires: DateTime::parse_from_rfc3339("2014-11-28T21:00:09+09:00").unwrap(),
                    session_key: Pubkey::from_str("2jKr1met2kCteHoTNtkTL51Sgw7rQKcF4YNdP5xfkPRB")
                        .unwrap(),
                    tokens: Tokens::Specific(vec![
                        (SymbolOrMint::Symbol("SOL".to_string()), "100".to_string()),
                        (
                            SymbolOrMint::Mint(
                                Pubkey::from_str("DFVMuhuS4hBfXsJE18EGVX9k75QMycUBNNLJi5bwADnu")
                                    .unwrap()
                            ),
                            "200".to_string()
                        ),
                    ]),
                    extra: HashMap::from([
                        ("key1".to_string(), "value1".to_string()),
                        ("key2".to_string(), "value2".to_string()),
                    ])
                }
            );
        }
    }
}
