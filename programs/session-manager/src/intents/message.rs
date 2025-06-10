use crate::{
    error::SessionManagerError,
    intents::claims::{Claims, Domain, Nonce, SessionKey},
};
use anchor_lang::prelude::*;
use std::{collections::HashMap, str::FromStr};

const MESSAGE_PREFIX: &str = "Fogo Sessions:\nSigning this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain you are signing from.\n\n";

#[derive(AnchorDeserialize)]
pub struct Message(pub(crate) Vec<u8>);

impl Message {
    pub fn parse_claims(self) -> Result<Claims> {
        let message =
            String::from_utf8(self.0).map_err(|_| error!(SessionManagerError::InvalidArgument))?;
        let message = message
            .strip_prefix(MESSAGE_PREFIX)
            .ok_or(error!(SessionManagerError::InvalidArgument))?;

        let mut kv = HashMap::new();
        for line in message.lines() {
            if let Some((key, value)) = line.split_once(": ") {
                kv.insert(key.to_string(), value.to_string());
            } else {
                return Err(error!(SessionManagerError::InvalidArgument));
            }
        }

        let claims = Claims {
            domain: kv
                .remove("domain")
                .map(Domain)
                .ok_or(error!(SessionManagerError::InvalidArgument))?,
            nonce: kv
                .remove("nonce")
                .and_then(|nonce| Pubkey::from_str(&nonce).ok().map(Nonce))
                .ok_or(error!(SessionManagerError::InvalidArgument))?,
            session_key: kv
                .remove("session_key")
                .and_then(|session_key| Pubkey::from_str(&session_key).ok().map(SessionKey))
                .ok_or(error!(SessionManagerError::InvalidArgument))?,
            extra: kv,
        };

        Ok(claims)
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    pub fn test_parse_message() {
        let key = Pubkey::new_unique();
        let nonce = Pubkey::new_unique();
        let message = format!(
            "{}domain: https://app.xyz\nsession_key: {}\nnonce: {}\nkey1: value1\nkey2: value2",
            MESSAGE_PREFIX, key, nonce
        );

        let parsed_message = Message(message.as_bytes().to_vec()).parse_claims().unwrap();
        assert_eq!(parsed_message.domain, Domain("https://app.xyz".to_string()));
        assert_eq!(parsed_message.session_key, SessionKey(key));
        assert_eq!(parsed_message.nonce, Nonce(nonce));
        assert_eq!(
            parsed_message.extra,
            HashMap::from([
                ("key1".to_string(), "value1".to_string()),
                ("key2".to_string(), "value2".to_string())
            ])
        );
    }
}
