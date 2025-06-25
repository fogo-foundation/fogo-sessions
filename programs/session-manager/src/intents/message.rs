use crate::{
    error::SessionManagerError,
    intents::body::{Domain, MessageBody, Nonce, SessionKey},
};
use anchor_lang::prelude::*;
use std::{
    collections::HashMap,
    iter::Peekable,
    str::{FromStr, Lines},
};

const MESSAGE_PREFIX: &str = "Fogo Sessions:\nSigning this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.\n\n";
const MANDATORY_KEYS: [&str; 4] = ["domain", "nonce", "session_key", "tokens"];
const KEY_VALUE_SEPARATOR: &str = ": ";
const LIST_ITEM_PREFIX: &str = "-";
const TOKEN_PERMISSIONS_SECTION_HEADER: &str = "tokens:";

fn parse_line_with_expected_key(lines: &mut Peekable<Lines>, expected_key: &str) -> Result<String> {
    let (key, value) = lines
        .next()
        .ok_or(error!(SessionManagerError::InvalidArgument))?
        .split_once(KEY_VALUE_SEPARATOR)
        .ok_or(error!(SessionManagerError::InvalidArgument))?;
    if key != expected_key {
        return Err(error!(SessionManagerError::InvalidArgument));
    }
    Ok(value.to_string())
}

fn parse_token_permissions(lines: &mut Peekable<Lines>) -> Result<Vec<(String, u64)>> {
    let mut tokens = vec![];

    if lines
        .peek()
        .is_some_and(|line| *line == TOKEN_PERMISSIONS_SECTION_HEADER)
    {
        lines.next();
        while lines
            .peek()
            .is_some_and(|line| line.starts_with(LIST_ITEM_PREFIX))
        {
            let line = lines
                .next()
                .ok_or(error!(SessionManagerError::InvalidArgument))?;
            let line = line
                .strip_prefix(LIST_ITEM_PREFIX)
                .ok_or(error!(SessionManagerError::InvalidArgument))?;
            let (symbol, amount) = line
                .split_once(KEY_VALUE_SEPARATOR)
                .ok_or(error!(SessionManagerError::InvalidArgument))?;

            if tokens.iter().any(|(m, _)| m == &symbol) {
                // No duplicate mints
                return Err(error!(SessionManagerError::InvalidArgument));
            } else {
                tokens.push((
                    symbol.to_string(),
                    amount
                        .parse()
                        .map_err(|_| error!(SessionManagerError::InvalidArgument))?,
                ));
            }
        }
    }
    Ok(tokens)
}

fn parse_extra(lines: &mut Peekable<Lines>) -> Result<HashMap<String, String>> {
    let mut kv = HashMap::new();
    for line in lines {
        let (key, value) = line
            .split_once(KEY_VALUE_SEPARATOR)
            .ok_or(error!(SessionManagerError::InvalidArgument))?;
        if MANDATORY_KEYS.contains(&key) || kv.insert(key.to_string(), value.to_string()).is_some()
        {
            // No duplicate keys
            return Err(error!(SessionManagerError::InvalidArgument));
        }
    }
    Ok(kv)
}

#[derive(AnchorDeserialize)]
pub struct Message(pub(crate) Vec<u8>);

impl Message {
    pub fn parse(self) -> Result<MessageBody> {
        let message =
            String::from_utf8(self.0).map_err(|_| error!(SessionManagerError::InvalidArgument))?;
        let message = message
            .strip_prefix(MESSAGE_PREFIX)
            .ok_or(error!(SessionManagerError::InvalidArgument))?;

        let mut lines = message.lines().peekable();

        let body = MessageBody {
            domain: Domain(parse_line_with_expected_key(&mut lines, "domain")?),
            nonce: Nonce(
                Pubkey::from_str(&parse_line_with_expected_key(&mut lines, "nonce")?)
                    .map_err(|_| error!(SessionManagerError::InvalidArgument))?,
            ),
            session_key: SessionKey(
                Pubkey::from_str(&parse_line_with_expected_key(&mut lines, "session_key")?)
                    .map_err(|_| error!(SessionManagerError::InvalidArgument))?,
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

    #[test]
    pub fn test_parse_message() {
        let session_key = Pubkey::new_unique();
        let nonce = Pubkey::new_unique();
        let token = Pubkey::new_unique();
        let message = format!(
            "{MESSAGE_PREFIX}domain: https://app.xyz\nnonce: {nonce}\nsession_key: {session_key}\ntokens:\n-{token}: 100\nkey1: value1\nkey2: value2"
        );

        let parsed_message = Message(message.as_bytes().to_vec()).parse().unwrap();
        assert_eq!(parsed_message.domain, Domain("https://app.xyz".to_string()));
        assert_eq!(parsed_message.session_key, SessionKey(session_key));
        assert_eq!(parsed_message.nonce, Nonce(nonce));
        assert_eq!(parsed_message.tokens, vec![(token.to_string(), 100)]);
        assert_eq!(
            parsed_message.extra,
            HashMap::from([
                ("key1".to_string(), "value1".to_string()),
                ("key2".to_string(), "value2".to_string()),
            ])
        );
    }
}
