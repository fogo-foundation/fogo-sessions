use anchor_lang::prelude::Pubkey;
use nom::{
    branch::permutation,
    bytes::complete::tag,
    character::complete::line_ending,
    combinator::{map, verify},
    error::{Error, ParseError},
    sequence::preceded,
    AsChar, Compare, Err, IResult, Input, ParseTo, Parser,
};
use solana_intents::{key_value::key_value, symbol_or_mint::SymbolOrMint, version::Version};

const MESSAGE_PREFIX: &str =
    "Fogo Transfer:\nSigning this intent will transfer the tokens as described below.\n";

#[derive(Debug, PartialEq)]
pub struct Message {
    pub version: Version,
    pub chain_id: String,
    pub symbol_or_mint: SymbolOrMint,
    pub amount: String,
    pub recipient: Pubkey,
    pub nonce: u64,
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
    I: for<'a> Compare<&'a str>,
    I: ParseTo<String>,
    I: ParseTo<SymbolOrMint>,
    I: ParseTo<Version>,
    I: ParseTo<Pubkey>,
    I: ParseTo<u64>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
{
    map(
        preceded(
            (tag(MESSAGE_PREFIX), line_ending),
            permutation((
                verify(key_value("version"), |version: &Version| {
                    version.major == 0 && version.minor == 1
                }),
                key_value("chain_id"),
                key_value("token"),
                key_value("amount"),
                key_value("recipient"),
                key_value("nonce"),
            )),
        ),
        |(version, chain_id, symbol_or_mint, amount, recipient, nonce)| Message {
            version,
            chain_id,
            symbol_or_mint,
            amount,
            recipient,
            nonce,
        },
    )
    .parse(input)
}

#[cfg(test)]
mod tests {
    use super::*;
    use indoc::indoc;
    use std::str::FromStr;

    #[test]
    fn test_parse() {
        let message = indoc! {"
            Fogo Transfer:
            Signing this intent will transfer the tokens as described below.

            version: 0.1
            chain_id: foo
            amount: 42.676
            nonce: 1
            recipient: Eticpp6xSX8oQESNactDVg631mjcZMwSYc3Tz2efRTeQ
            token: FOGO"};

        assert_eq!(
            TryInto::<Message>::try_into(message.as_bytes().to_vec()).unwrap(),
            Message {
                version: Version { major: 0, minor: 1 },
                chain_id: "foo".to_string(),
                symbol_or_mint: SymbolOrMint::Symbol("FOGO".to_string()),
                amount: "42.676".to_string(),
                recipient: Pubkey::from_str("Eticpp6xSX8oQESNactDVg631mjcZMwSYc3Tz2efRTeQ")
                    .unwrap(),
                nonce: 1
            }
        );
    }
}
