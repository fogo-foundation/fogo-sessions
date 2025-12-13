use borsh::BorshDeserialize;
use itertools::Itertools;
use solana_pubkey::Pubkey;
use std::{
    hash::Hash,
    str::{from_utf8, Utf8Error},
};

const EXPECTED_SIGNING_DOMAIN: &[u8; 16] = b"\xffsolana offchain";

#[derive(PartialEq, Eq, Debug, Clone)]
pub enum OffchainMessage {
    V0(OffchainMessageV0),
    V1(OffchainMessageV1),
}

#[derive(PartialEq, Eq, Debug, Clone)]
pub struct OffchainMessageV0 {
    application_domain: String,
    signers: Vec<Pubkey>,
    message: Vec<u8>,
}

#[derive(PartialEq, Eq, Debug, Clone)]
pub struct OffchainMessageV1 {
    signers: Vec<Pubkey>,
    message: Vec<u8>,
}

impl From<OffchainMessage> for Vec<u8> {
    fn from(message: OffchainMessage) -> Self {
        match message {
            OffchainMessage::V0(OffchainMessageV0 { message, .. }) => message,
            OffchainMessage::V1(OffchainMessageV1 { message, .. }) => message,
        }
    }
}

impl TryFrom<&[u8]> for OffchainMessage {
    type Error = MessageDeserializeError;

    fn try_from(bytes: &[u8]) -> Result<Self, MessageDeserializeError> {
        OffchainMessageFormat::try_from_slice(bytes)
            .map_err(MessageDeserializeError::IncorrectMessageFormat)?
            .try_into()
    }
}

impl TryFrom<OffchainMessageFormat> for OffchainMessage {
    type Error = MessageDeserializeError;

    fn try_from(
        OffchainMessageFormat {
            signing_domain,
            header,
        }: OffchainMessageFormat,
    ) -> Result<Self, MessageDeserializeError> {
        if &signing_domain == EXPECTED_SIGNING_DOMAIN {
            header.try_into()
        } else {
            Err(MessageDeserializeError::InvalidSigningDomain)
        }
    }
}

impl TryFrom<OffchainMessageHeader> for OffchainMessage {
    type Error = MessageDeserializeError;

    fn try_from(header: OffchainMessageHeader) -> Result<Self, MessageDeserializeError> {
        match header {
            OffchainMessageHeader::V0(header) => Ok(Self::V0(header.try_into()?)),
            OffchainMessageHeader::V1(header) => Ok(Self::V1(header.try_into()?)),
        }
    }
}

impl TryFrom<OffchainMessageHeaderV0> for OffchainMessageV0 {
    type Error = MessageDeserializeError;

    fn try_from(
        OffchainMessageHeaderV0 {
            application_domain,
            signers,
            message,
            message_format,
        }: OffchainMessageHeaderV0,
    ) -> Result<Self, MessageDeserializeError> {
        // See constraints in https://github.com/solana-foundation/SRFCs/discussions/3
        if message_format == MessageFormat::RestrictedAscii && !is_printable_ascii(&message) {
            Err(MessageDeserializeError::MessageContainsNonPrintableAscii)
        } else if message.len() > max_message_len(message_format) {
            Err(MessageDeserializeError::MessageTooLong)
        } else {
            let application_domain = from_utf8(&application_domain)
                .map_err(MessageDeserializeError::InvalidApplicationDomain)?
                .trim()
                .to_owned();
            Ok(Self {
                application_domain,
                signers,
                message,
            })
        }
    }
}

// See https://github.com/solana-foundation/SRFCs/discussions/3
fn max_message_len(message_format: MessageFormat) -> usize {
    match message_format {
        MessageFormat::RestrictedAscii => 1232,
        MessageFormat::LimitedUtf8 => 1232,
        MessageFormat::ExtendedUtf8 => 65535,
    }
}

fn is_printable_ascii(message: &[u8]) -> bool {
    message.iter().all(|chr| (0x20..=0x7e).contains(chr))
}

impl TryFrom<OffchainMessageHeaderV1> for OffchainMessageV1 {
    type Error = MessageDeserializeError;

    fn try_from(
        OffchainMessageHeaderV1 { signers, message }: OffchainMessageHeaderV1,
    ) -> Result<Self, MessageDeserializeError> {
        // See constraints in https://github.com/solana-foundation/SRFCs/discussions/3
        if signers.is_empty() {
            Err(MessageDeserializeError::NoSigners)
        } else if !is_sorted_lexicographically(&signers) {
            Err(MessageDeserializeError::SignersNotSorted)
        } else if contains_duplicates(&signers) {
            Err(MessageDeserializeError::DuplicateSigners)
        } else {
            Ok(Self { signers, message })
        }
    }
}

fn is_sorted_lexicographically<T: ToString>(slice: &[T]) -> bool {
    slice
        .iter()
        .map(|item| item.to_string())
        .collect::<Vec<_>>()
        .is_sorted()
}

fn contains_duplicates<T: Eq + Hash>(slice: &[T]) -> bool {
    slice.iter().duplicates().peekable().peek().is_some()
}

#[derive(Debug)]
pub enum MessageDeserializeError {
    InvalidSigningDomain,
    #[allow(dead_code)]
    IncorrectMessageFormat(std::io::Error),
    #[allow(dead_code)]
    InvalidApplicationDomain(Utf8Error),
    MessageContainsNonPrintableAscii,
    MessageTooLong,
    NoSigners,
    SignersNotSorted,
    DuplicateSigners,
}

#[derive(PartialEq, Eq, Debug, Clone, BorshDeserialize)]
struct OffchainMessageFormat {
    signing_domain: [u8; 16],
    header: OffchainMessageHeader,
}

#[derive(PartialEq, Eq, Debug, Clone, BorshDeserialize)]
enum OffchainMessageHeader {
    V0(OffchainMessageHeaderV0),
    V1(OffchainMessageHeaderV1),
}

#[derive(PartialEq, Eq, Debug, Clone, BorshDeserialize)]
struct OffchainMessageHeaderV0 {
    application_domain: [u8; 32],
    message_format: MessageFormat,
    #[borsh(deserialize_with = "vec_with_len::<_, u8, Pubkey>")]
    signers: Vec<Pubkey>,
    #[borsh(deserialize_with = "vec_with_len::<_, u16, u8>")]
    message: Vec<u8>,
}

#[derive(PartialEq, Eq, Debug, Clone, BorshDeserialize)]
struct OffchainMessageHeaderV1 {
    #[borsh(deserialize_with = "vec_with_len::<_, u8, Pubkey>")]
    signers: Vec<Pubkey>,
    #[borsh(deserialize_with = "trailing_vec")]
    message: Vec<u8>,
}

fn vec_with_len<R, L, O>(reader: &mut R) -> Result<Vec<O>, borsh::io::Error>
where
    R: borsh::io::Read,
    L: BorshDeserialize,
    L: Into<usize>,
    O: BorshDeserialize,
{
    let len = L::deserialize_reader(reader)?;
    let mut contents = vec![];
    for _ in 0..len.into() {
        contents.push(O::deserialize_reader(reader)?)
    }
    Ok(contents)
}

fn trailing_vec<R>(reader: &mut R) -> Result<Vec<u8>, borsh::io::Error>
where
    R: borsh::io::Read,
{
    let mut contents = vec![];
    reader.read_to_end(&mut contents)?;
    Ok(contents)
}

#[derive(PartialEq, Eq, Debug, Clone, BorshDeserialize)]
enum MessageFormat {
    RestrictedAscii,
    LimitedUtf8,
    ExtendedUtf8,
}

#[cfg(test)]
mod tests {
    mod v0 {
        use super::super::*;
        use solana_pubkey::pubkey;

        #[test]
        fn test_valid() {
            assert_eq!(
                OffchainMessage::try_from(
                    [
                        b"\xffsolana offchain".to_vec(),
                        vec![0],
                        b"foobar                          ".to_vec(),
                        vec![1],
                        vec![3],
                        pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm")
                            .to_bytes()
                            .to_vec(),
                        pubkey!("865UEUDXB7h2XcPtnkpGS2DPhe9Y58r6RFCAhG4UE1iN")
                            .to_bytes()
                            .to_vec(),
                        pubkey!("Eticpp6xSX8oQESNactDVg631mjcZMwSYc3Tz2efRTeQ")
                            .to_bytes()
                            .to_vec(),
                        9u16.to_le_bytes().to_vec(),
                        b"foobarbaz".to_vec()
                    ]
                    .concat()
                    .as_ref()
                )
                .unwrap(),
                OffchainMessage::V0(OffchainMessageV0 {
                    application_domain: String::from("foobar"),
                    signers: vec![
                        pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm"),
                        pubkey!("865UEUDXB7h2XcPtnkpGS2DPhe9Y58r6RFCAhG4UE1iN"),
                        pubkey!("Eticpp6xSX8oQESNactDVg631mjcZMwSYc3Tz2efRTeQ")
                    ],
                    message: b"foobarbaz".to_vec()
                })
            )
        }

        #[test]
        fn test_invalid_signing_domain() {
            assert!(matches!(
                OffchainMessage::try_from(
                    [
                        b"\xffsolami offchain".to_vec(),
                        vec![0],
                        b"foobar                          ".to_vec(),
                        vec![1],
                        vec![1],
                        pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm")
                            .to_bytes()
                            .to_vec(),
                        9u16.to_le_bytes().to_vec(),
                        b"foobarbaz".to_vec()
                    ]
                    .concat()
                    .as_ref()
                )
                .unwrap_err(),
                MessageDeserializeError::InvalidSigningDomain
            ))
        }

        #[test]
        fn test_invalid_application_domain() {
            assert!(matches!(
                OffchainMessage::try_from(
                    [
                        b"\xffsolana offchain".to_vec(),
                        vec![0],
                        [
                            0, 159, 146, 150, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                            0, 0, 0, 0, 0, 0, 0, 0, 0, 0
                        ]
                        .to_vec(),
                        vec![1],
                        vec![1],
                        pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm")
                            .to_bytes()
                            .to_vec(),
                        9u16.to_le_bytes().to_vec(),
                        b"foobarbaz".to_vec()
                    ]
                    .concat()
                    .as_ref()
                )
                .unwrap_err(),
                MessageDeserializeError::InvalidApplicationDomain(_)
            ))
        }

        #[test]
        fn test_message_with_nonprintable_ascii() {
            assert!(matches!(
                OffchainMessage::try_from(
                    [
                        b"\xffsolana offchain".to_vec(),
                        vec![0],
                        b"foobar                          ".to_vec(),
                        vec![0],
                        vec![1],
                        pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm")
                            .to_bytes()
                            .to_vec(),
                        10u16.to_le_bytes().to_vec(),
                        b"foo\nbarbaz".to_vec()
                    ]
                    .concat()
                    .as_ref()
                )
                .unwrap_err(),
                MessageDeserializeError::MessageContainsNonPrintableAscii
            ))
        }

        #[test]
        fn test_message_too_long() {
            assert!(matches!(
                OffchainMessage::try_from(
                    [
                        b"\xffsolana offchain".to_vec(),
                        vec![0],
                        b"foobar                          ".to_vec(),
                        vec![0],
                        vec![1],
                        pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm")
                            .to_bytes()
                            .to_vec(),
                        1233u16.to_le_bytes().to_vec(),
                        [0x20; 1233].to_vec()
                    ]
                    .concat()
                    .as_ref()
                )
                .unwrap_err(),
                MessageDeserializeError::MessageTooLong
            ))
        }
    }

    mod v1 {
        use super::super::*;
        use solana_pubkey::pubkey;

        #[test]
        fn test_valid() {
            assert_eq!(
                OffchainMessage::try_from(
                    [
                        b"\xffsolana offchain".to_vec(),
                        vec![1],
                        vec![3],
                        pubkey!("865UEUDXB7h2XcPtnkpGS2DPhe9Y58r6RFCAhG4UE1iN")
                            .to_bytes()
                            .to_vec(),
                        pubkey!("Eticpp6xSX8oQESNactDVg631mjcZMwSYc3Tz2efRTeQ")
                            .to_bytes()
                            .to_vec(),
                        pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm")
                            .to_bytes()
                            .to_vec(),
                        b"foobarbaz".to_vec()
                    ]
                    .concat()
                    .as_ref()
                )
                .unwrap(),
                OffchainMessage::V1(OffchainMessageV1 {
                    signers: vec![
                        pubkey!("865UEUDXB7h2XcPtnkpGS2DPhe9Y58r6RFCAhG4UE1iN"),
                        pubkey!("Eticpp6xSX8oQESNactDVg631mjcZMwSYc3Tz2efRTeQ"),
                        pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm"),
                    ],
                    message: b"foobarbaz".to_vec()
                })
            )
        }

        #[test]
        fn test_invalid_signing_domain() {
            assert!(matches!(
                OffchainMessage::try_from(
                    [
                        b"\xffsolami offchain".to_vec(),
                        vec![1],
                        vec![1],
                        pubkey!("865UEUDXB7h2XcPtnkpGS2DPhe9Y58r6RFCAhG4UE1iN")
                            .to_bytes()
                            .to_vec(),
                        b"foobarbaz".to_vec()
                    ]
                    .concat()
                    .as_ref()
                )
                .unwrap_err(),
                MessageDeserializeError::InvalidSigningDomain
            ))
        }

        #[test]
        fn test_no_signers() {
            assert!(matches!(
                OffchainMessage::try_from(
                    [
                        b"\xffsolana offchain".to_vec(),
                        vec![1],
                        vec![0],
                        b"foobarbaz".to_vec()
                    ]
                    .concat()
                    .as_ref()
                )
                .unwrap_err(),
                MessageDeserializeError::NoSigners
            ))
        }

        #[test]
        fn test_signers_not_sorted() {
            assert!(matches!(
                OffchainMessage::try_from(
                    [
                        b"\xffsolana offchain".to_vec(),
                        vec![1],
                        vec![3],
                        pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm")
                            .to_bytes()
                            .to_vec(),
                        pubkey!("865UEUDXB7h2XcPtnkpGS2DPhe9Y58r6RFCAhG4UE1iN")
                            .to_bytes()
                            .to_vec(),
                        pubkey!("Eticpp6xSX8oQESNactDVg631mjcZMwSYc3Tz2efRTeQ")
                            .to_bytes()
                            .to_vec(),
                        b"foobarbaz".to_vec()
                    ]
                    .concat()
                    .as_ref()
                )
                .unwrap_err(),
                MessageDeserializeError::SignersNotSorted
            ))
        }

        #[test]
        fn test_duplicate_signers() {
            assert!(matches!(
                OffchainMessage::try_from(
                    [
                        b"\xffsolana offchain".to_vec(),
                        vec![1],
                        vec![3],
                        pubkey!("Eticpp6xSX8oQESNactDVg631mjcZMwSYc3Tz2efRTeQ")
                            .to_bytes()
                            .to_vec(),
                        pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm")
                            .to_bytes()
                            .to_vec(),
                        pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm")
                            .to_bytes()
                            .to_vec(),
                        b"foobarbaz".to_vec()
                    ]
                    .concat()
                    .as_ref()
                )
                .unwrap_err(),
                MessageDeserializeError::DuplicateSigners
            ))
        }
    }
}
