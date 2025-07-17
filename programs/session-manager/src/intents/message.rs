use crate::{
    error::SessionManagerError,
    intents::body::{MessageBody, SessionKey, SymbolOrMint, Tokens, Version},
};
use anchor_lang::prelude::*;
use chrono::DateTime;
use domain_registry::domain::Domain;
use rust_decimal::Decimal;
use std::{
    collections::HashMap,
    iter::Peekable,
    str::{FromStr, Lines},
};

const MESSAGE_PREFIX: &str = "Fogo Sessions:\nSigning this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.\n\n";
const MANDATORY_KEYS: [&str; 6] = [
    "version",
    "chain_id",
    "domain",
    "expires",
    "session_key",
    "tokens",
];
const KEY_VALUE_SEPARATOR: &str = ": ";
const LIST_ITEM_PREFIX: &str = "-";
const TOKEN_PERMISSIONS_SECTION_KEY: &str = "tokens";
const UNLIMITED_TOKEN_PERMISSIONS_VALUE: &str = "this app may spend any amount of any token";

fn parse_line_with_expected_key(lines: &mut Peekable<Lines>, expected_key: &str) -> Result<String> {
    let (key, value) = lines
        .next()
        .ok_or(error!(SessionManagerError::RequiredKeyNotFound))?
        .split_once(KEY_VALUE_SEPARATOR)
        .ok_or(error!(SessionManagerError::ParsingErrorRequiredKey))?;
    if key != expected_key {
        return Err(error!(SessionManagerError::RequiredKeyNotFound));
    }
    Ok(value.to_string())
}

fn parse_token_permissions(lines: &mut Peekable<Lines>) -> Result<Tokens> {
    match lines.peek() {
        Some(line) if *line == format!("{TOKEN_PERMISSIONS_SECTION_KEY}:") => {
            let mut tokens = vec![];
            lines.next();
            while lines
                .peek()
                .is_some_and(|line| line.starts_with(LIST_ITEM_PREFIX))
            {
                let line = lines
                    .next()
                    .ok_or(error!(SessionManagerError::ParsingErrorTokenSection))?;
                let line = line
                    .strip_prefix(LIST_ITEM_PREFIX)
                    .ok_or(error!(SessionManagerError::ParsingErrorTokenSection))?;
                let (symbol, amount) = line
                    .split_once(KEY_VALUE_SEPARATOR)
                    .ok_or(error!(SessionManagerError::ParsingErrorTokenSection))?;

                let symbol_or_mint = Pubkey::from_str(symbol)
                    .map(SymbolOrMint::Mint)
                    .unwrap_or(SymbolOrMint::Symbol(symbol.to_string()));
                if tokens.iter().any(|(x, _)| x == &symbol_or_mint) {
                    // No duplicate mints
                    return Err(error!(SessionManagerError::DuplicateToken));
                } else {
                    tokens.push((
                        symbol_or_mint,
                        Decimal::from_str_exact(amount)
                            .map_err(|_| error!(SessionManagerError::ParsingErrorDecimal))?,
                    ));
                }
            }
            Ok(Tokens::Specific(tokens))
        }
        Some(line) if *line == format!("{TOKEN_PERMISSIONS_SECTION_KEY}{KEY_VALUE_SEPARATOR}{UNLIMITED_TOKEN_PERMISSIONS_VALUE}") => {
            lines.next();
            Ok(Tokens::All)
        }
        _ => Ok(Tokens::Specific(vec![])),
    }
}

fn parse_extra(lines: &mut Peekable<Lines>) -> Result<HashMap<String, String>> {
    let mut kv = HashMap::new();
    for line in lines {
        let (key, value) = line
            .split_once(KEY_VALUE_SEPARATOR)
            .ok_or(error!(SessionManagerError::ParsingErrorExtraSection))?;
        if MANDATORY_KEYS.contains(&key) || kv.insert(key.to_string(), value.to_string()).is_some()
        {
            // No duplicate keys
            return Err(error!(SessionManagerError::ReservedKey));
        }
    }
    Ok(kv)
}

#[derive(AnchorDeserialize)]
pub struct Message(pub(crate) Vec<u8>);

impl Message {
    pub fn parse(self) -> Result<MessageBody> {
        let message = String::from_utf8(self.0)
            .map_err(|_| error!(SessionManagerError::InvalidMessageString))?;
        let message = message
            .strip_prefix(MESSAGE_PREFIX)
            .ok_or(error!(SessionManagerError::IntentHeaderMismatch))?;

        let mut lines = message.lines().peekable();

        let body = MessageBody {
            version: Version::parse_and_check(&parse_line_with_expected_key(
                &mut lines, "version",
            )?)?,
            chain_id: parse_line_with_expected_key(&mut lines, "chain_id")?,
            domain: Domain::new_checked(&parse_line_with_expected_key(&mut lines, "domain")?)?,
            expires: DateTime::parse_from_rfc3339(&parse_line_with_expected_key(
                &mut lines, "expires",
            )?)
            .map_err(|_| error!(SessionManagerError::ParsingErrorDate))?
            .into(),
            session_key: SessionKey(
                Pubkey::from_str(&parse_line_with_expected_key(&mut lines, "session_key")?)
                    .map_err(|_| error!(SessionManagerError::ParsingErrorSessionKey))?,
            ),
            tokens: parse_token_permissions(&mut lines)?,
            extra: parse_extra(&mut lines)?,
        };

        Ok(body)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use rust_decimal::dec;

    #[test]
    pub fn test_parse_message() {
        let session_key = Pubkey::new_unique();
        let message = format!(
            "{MESSAGE_PREFIX}version: 0.1\nchain_id: localnet\ndomain: https://app.xyz\nexpires: 2014-11-28T21:00:09+09:00\nsession_key: {session_key}\ntokens:\n-SOL: 100\nkey1: value1\nkey2: value2"
        );
        let parsed_message = Message(message.as_bytes().to_vec()).parse().unwrap();
        assert_eq!(parsed_message.chain_id, "localnet".to_string());
        assert_eq!(
            parsed_message.domain,
            Domain::new_checked("https://app.xyz").unwrap()
        );
        assert_eq!(parsed_message.session_key, SessionKey(session_key));
        assert_eq!(
            parsed_message.expires,
            DateTime::parse_from_rfc3339("2014-11-28T12:00:09Z").unwrap()
        );
        assert_eq!(
            parsed_message.tokens,
            Tokens::Specific(vec![(SymbolOrMint::Symbol("SOL".to_string()), dec!(100))])
        );
        assert_eq!(
            parsed_message.extra,
            HashMap::from([
                ("key1".to_string(), "value1".to_string()),
                ("key2".to_string(), "value2".to_string()),
            ])
        );
    }

    #[test]
    pub fn test_parse_message_with_unlimited_token_permissions() {
        let message = "Fogo Sessions:
Signing this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.

version: 0.1
chain_id: localnet
domain: http://localhost:3000
expires: 2025-07-17T17:30:15.033Z
session_key: AnDvGGfeXStwG8pfmp98nodbcdeYGNz8r6fPxjrvJxK5
tokens: this app may spend any amount of any token";

        let parsed_message = Message(message.as_bytes().to_vec()).parse().unwrap();
        assert_eq!(parsed_message.version, Version { major: 0, minor: 1 });
        assert_eq!(parsed_message.chain_id, "localnet".to_string());
        assert_eq!(
            parsed_message.domain,
            Domain::new_checked("http://localhost:3000").unwrap()
        );
        assert_eq!(
            parsed_message.expires,
            DateTime::parse_from_rfc3339("2025-07-17T17:30:15.033Z").unwrap()
        );
        assert_eq!(
            parsed_message.session_key,
            SessionKey(Pubkey::from_str("AnDvGGfeXStwG8pfmp98nodbcdeYGNz8r6fPxjrvJxK5").unwrap())
        );
        assert_eq!(parsed_message.tokens, Tokens::All);
        assert_eq!(parsed_message.extra, HashMap::new());
    }
}
