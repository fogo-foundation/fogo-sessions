use std::{collections::HashMap, str::FromStr};
use anchor_lang::prelude::*;
use crate::{error::SessionManagerError, intents::claims::{Domain, Nonce, SessionKey}};

const MESSAGE_PREFIX: &str = "Fogo Sessions:\nSigning this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain you are signing from.\n\n";
pub struct Claims {
    pub domain: Domain,
    pub nonce: Nonce,
    pub session_key: SessionKey,
    pub extra: HashMap<String, String>
}

#[derive(AnchorDeserialize)]
pub struct Message (pub(crate) Vec<u8>);


impl Message {
    pub fn parse_claims(self) -> Result<Claims> {
        let message = String::from_utf8(self.0).map_err(|_| error!(SessionManagerError::InvalidArgument))?;
        let message = message.strip_prefix(MESSAGE_PREFIX).ok_or(error!(SessionManagerError::InvalidMessage))?;
    
        let mut kv = HashMap::new();
        for line in message.lines() {
            if let Some((key, value)) = line.split_once(": ") {
                kv.insert(key.to_string(), value.to_string());
            } else {
                return Err(error!(SessionManagerError::InvalidArgument));
            }
        }
    
        let claims = Claims {
            domain: kv.remove("domain").map(|domain| Domain(domain)).ok_or(error!(SessionManagerError::InvalidArgument))?,
            nonce: kv.remove("nonce").map(|nonce| Pubkey::from_str(&nonce).ok().map(|nonce| Nonce(nonce))).flatten().ok_or(error!(SessionManagerError::InvalidArgument))?,
            session_key: kv.remove("session_key").map(|session_key| Pubkey::from_str(&session_key).ok().map(|session_key| SessionKey(session_key))).flatten().ok_or(error!(SessionManagerError::InvalidArgument))?,
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
        let message = format!("Fogo Sessions:\nSigning this intent will allow the app to transfer your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain you are signing from.
domain https://app.xyz
session_key {}
nonce {}
key1 value1
key2 value2", key, nonce);

        println!("message: {}", message);
        let parsed_message = Message(message.as_bytes().to_vec()).parse_claims().unwrap();
        assert_eq!(parsed_message.domain, Domain("https://app.xyz".to_string()));
        assert_eq!(parsed_message.session_key, SessionKey(key));
        assert_eq!(parsed_message.nonce, Nonce(nonce));
        assert_eq!(parsed_message.extra, HashMap::from([("key1".to_string(), "value1".to_string()), ("key2".to_string(), "value2".to_string())]));
    }
}