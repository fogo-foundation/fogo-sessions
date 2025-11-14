use nom::{
    bytes::complete::tag,
    character::complete::line_ending,
    combinator::{eof, map, verify},
    error::{Error, ParseError},
    sequence::delimited,
    AsChar, Compare, Err, IResult, Input, Offset, ParseTo, Parser,
};
use solana_intents::{tag_key_value, SymbolOrMint, Version};

const BRIDGE_MESSAGE_PREFIX: &str =
    "Fogo Bridge Transfer:\nSigning this intent will bridge out the tokens as described below.\n";

#[derive(Debug, PartialEq)]
pub enum BridgeMessage {
    Ntt(NttMessage),
}

#[derive(Debug, PartialEq)]
pub struct NttMessage {
    pub version: Version,
    pub from_chain_id: String,
    pub symbol_or_mint: SymbolOrMint,
    pub amount: String,
    pub to_chain_id: String,
    pub recipient_address: String,
    pub fee_amount: String,
    pub fee_symbol_or_mint: SymbolOrMint,
    pub nonce: u64,
}

#[derive(Copy, Clone, PartialEq)]
pub enum WormholeChainId {
    Solana,
    Fogo,
}

/// Mapping from https://wormhole.com/docs/products/reference/chain-ids/
impl From<WormholeChainId> for u16 {
    fn from(chain_id: WormholeChainId) -> u16 {
        match chain_id {
            WormholeChainId::Solana => 1,
            WormholeChainId::Fogo => 51,
        }
    }
}

impl WormholeChainId {
    pub fn decimals_native(self) -> u32 {
        match self {
            WormholeChainId::Solana => 9,
            WormholeChainId::Fogo => 9,
        }
    }

    /// The decimals of the gas price specification (e.g. microlamports)
    pub fn decimals_gas_price(self) -> u32 {
        match self {
            WormholeChainId::Solana => 15,
            WormholeChainId::Fogo => 15,
        }
    }
}

pub fn convert_chain_id_to_wormhole(chain_id: &str) -> Option<WormholeChainId> {
    match chain_id {
        "solana" => Some(WormholeChainId::Solana),
        "fogo" => Some(WormholeChainId::Fogo),
        _ => None,
    }
}

impl TryFrom<Vec<u8>> for BridgeMessage {
    type Error = Err<Error<Vec<u8>>>;

    fn try_from(message: Vec<u8>) -> Result<Self, Self::Error> {
        match message_ntt.parse(message.as_slice()) {
            Ok((_, message)) => Ok(BridgeMessage::Ntt(message)),
            Err(e) => Err(Err::<Error<&[u8]>>::to_owned(e)),
        }
    }
}

fn message_ntt<I, E>(input: I) -> IResult<I, NttMessage, E>
where
    I: Input,
    I: ParseTo<String>,
    I: ParseTo<SymbolOrMint>,
    I: ParseTo<Version>,
    I: ParseTo<u64>,
    I: ParseTo<u16>,
    I: Offset,
    I: for<'a> Compare<&'a str>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
{
    map(
        delimited(
            (tag(BRIDGE_MESSAGE_PREFIX), line_ending),
            (
                verify(tag_key_value("version"), |version: &Version| {
                    version.major == 0 && version.minor == 2
                }),
                tag_key_value("from_chain_id"),
                tag_key_value("to_chain_id"),
                tag_key_value("token"),
                tag_key_value("amount"),
                tag_key_value("recipient_address"),
                tag_key_value("fee_token"),
                tag_key_value("fee_amount"),
                tag_key_value("nonce"),
            ),
            eof,
        ),
        |(
            version,
            from_chain_id,
            to_chain_id,
            symbol_or_mint,
            amount,
            recipient_address,
            fee_symbol_or_mint,
            fee_amount,
            nonce,
        )| NttMessage {
            version,
            from_chain_id,
            to_chain_id,
            symbol_or_mint,
            amount,
            recipient_address,
            fee_amount,
            fee_symbol_or_mint,
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

    #[test]
    fn test_parse() {
        let message = indoc! {"
            Fogo Bridge Transfer:
            Signing this intent will bridge out the tokens as described below.

            version: 0.2
            from_chain_id: foo
            to_chain_id: solana
            token: FOGO
            amount: 42.676
            recipient_address: 0xabc906d4A6074599D5471f04f9d6261030C8debe
            fee_token: USDC
            fee_amount: 0.001
            nonce: 1
        "};

        assert_eq!(
            TryInto::<BridgeMessage>::try_into(message.as_bytes().to_vec()).unwrap(),
            BridgeMessage::Ntt(NttMessage {
                version: Version { major: 0, minor: 2 },
                from_chain_id: "foo".to_string(),
                to_chain_id: "solana".to_string(),
                symbol_or_mint: SymbolOrMint::Symbol("FOGO".to_string()),
                amount: "42.676".to_string(),
                recipient_address: "0xabc906d4A6074599D5471f04f9d6261030C8debe".to_string(),
                fee_symbol_or_mint: SymbolOrMint::Symbol("USDC".to_string()),
                fee_amount: "0.001".to_string(),
                nonce: 1
            })
        );
    }

    #[test]
    fn test_parse_with_unexpected_data_after_end() {
        let message = indoc! {"
            Fogo Bridge Transfer:
            Signing this intent will bridge out the tokens as described below.

            version: 0.2
            from_chain_id: foo
            to_chain_id: solana
            token: FOGO
            amount: 42.676
            recipient_address: 0xabc906d4A6074599D5471f04f9d6261030C8debe
            fee_token: USDC
            fee_amount: 0.001
            nonce: 1
            this data should not be here"};

        let result = TryInto::<BridgeMessage>::try_into(message.as_bytes().to_vec());
        assert_eq!(
            result,
            Err(Err::Error(Error {
                code: ErrorKind::Eof,
                input: "this data should not be here".as_bytes().to_vec()
            }))
        );
    }
}
