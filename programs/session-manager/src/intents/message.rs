use crate::{
    error::SessionManagerError,
    intents::body::{Domain, MessageBody, Nonce, SessionKey},
};
use anchor_lang::prelude::*;
use std::{
    collections::HashMap,
    str::{FromStr, Lines},
};

const MESSAGE_PREFIX: &str = "Fogo Sessions:\nSigning this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.\n\n";
const MANDATORY_KEYS: [&str; 3] = ["domain", "nonce", "session_key"];
const KEY_VALUE_SEPARATOR: &str = ": ";

fn parse_line_with_expected_key(lines: &mut Lines, expected_key: &str) -> Result<String> {
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

fn parse_extra(lines: &mut Lines) -> Result<HashMap<String, String>> {
    let mut kv = HashMap::new();
    for line in lines {
        let (key, value) = line
            .split_once(KEY_VALUE_SEPARATOR)
            .ok_or(error!(SessionManagerError::InvalidArgument))?;
        if kv.insert(key.to_string(), value.to_string()).is_some() || MANDATORY_KEYS.contains(&key)
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

        let mut lines = message.lines();

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
        let message = format!(
            "{MESSAGE_PREFIX}domain: https://app.xyz\nnonce: {nonce}\nsession_key: {session_key}\nkey1: value1\nkey2: value2"
        );

        let parsed_message = Message(message.as_bytes().to_vec()).parse().unwrap();
        assert_eq!(parsed_message.domain, Domain("https://app.xyz".to_string()));
        assert_eq!(parsed_message.session_key, SessionKey(session_key));
        assert_eq!(parsed_message.nonce, Nonce(nonce));
        assert_eq!(
            parsed_message.extra,
            HashMap::from([
                ("key1".to_string(), "value1".to_string()),
                ("key2".to_string(), "value2".to_string()),
            ])
        );
    }
}
