use anchor_lang::prelude::Pubkey;
use nom::{
    bytes::complete::tag,
    character::complete::line_ending,
    combinator::{eof, map, verify},
    error::{Error, ParseError},
    sequence::delimited,
    AsChar, Compare, Err, IResult, Input, Offset, ParseTo, Parser,
};
use solana_intents::{tag_key_value, SymbolOrMint, Version};

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
    I: ParseTo<String>,
    I: ParseTo<SymbolOrMint>,
    I: ParseTo<Version>,
    I: ParseTo<Pubkey>,
    I: ParseTo<u64>,
    I: Offset,
    I: for<'a> Compare<&'a str>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
{
    map(
        delimited(
            (tag(MESSAGE_PREFIX), line_ending),
            (
                verify(tag_key_value("version"), |version: &Version| {
                    version.major == 0 && version.minor == 1
                }),
                tag_key_value("chain_id"),
                tag_key_value("token"),
                tag_key_value("amount"),
                tag_key_value("recipient"),
                tag_key_value("nonce"),
            ),
            eof,
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
    use nom::error::ErrorKind;
    use std::str::FromStr;

    #[test]
    fn test_parse() {
        let message = indoc! {"
            Fogo Transfer:
            Signing this intent will transfer the tokens as described below.

            version: 0.1
            chain_id: foo
            token: FOGO
            amount: 42.676
            recipient: Eticpp6xSX8oQESNactDVg631mjcZMwSYc3Tz2efRTeQ
            nonce: 1
        "};

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

    #[test]
    fn test_parse_with_unexpected_data_after_end() {
        let message = indoc! {"
            Fogo Transfer:
            Signing this intent will transfer the tokens as described below.

            version: 0.1
            chain_id: foo
            token: FOGO
            amount: 42.676
            recipient: Eticpp6xSX8oQESNactDVg631mjcZMwSYc3Tz2efRTeQ
            nonce: 1
            this data should not be here"};

        let result = TryInto::<Message>::try_into(message.as_bytes().to_vec());
        assert_eq!(result, Err(Err::Error(Error {
            code: ErrorKind::Eof,
            input: "this data should not be here".as_bytes().to_vec()
        })));
    }
}
