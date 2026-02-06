use crate::offchain_message::OffchainMessage;
use borsh::BorshDeserialize;
use solana_offchain_message::OffchainMessage as LegacyOffchainMessage;
use solana_program::{
    account_info::AccountInfo, ed25519_program, instruction::Instruction,
    program_error::ProgramError, pubkey::Pubkey, sysvar::instructions::get_instruction_relative,
};

mod key_value;
mod offchain_message;
mod symbol_or_mint;
mod version;

pub use key_value::{key_value, key_value_with_key_type, tag_key_value};
pub use symbol_or_mint::SymbolOrMint;
pub use version::Version;

pub struct Intent<M> {
    pub signer: Pubkey,
    pub message: M,
}

impl<E, M: TryFrom<Vec<u8>, Error = E>> Intent<M> {
    pub fn load(sysvar_instructions: &AccountInfo<'_>) -> Result<Self, IntentError<E>> {
        get_instruction_relative(-1, sysvar_instructions)?.try_into()
    }
}

impl<E, M: TryFrom<Vec<u8>, Error = E>> TryFrom<Instruction> for Intent<M> {
    type Error = IntentError<E>;

    fn try_from(
        Instruction {
            data, program_id, ..
        }: Instruction,
    ) -> Result<Self, Self::Error> {
        if program_id.eq(&ed25519_program::ID) {
            Ed25519InstructionData::try_from_slice(&data)?.try_into()
        } else {
            Err(IntentError::IncorrectInstructionProgramId)
        }
    }
}

impl<E, M: TryFrom<Vec<u8>, Error = E>> TryFrom<Ed25519InstructionData> for Intent<M> {
    type Error = IntentError<E>;

    fn try_from(data: Ed25519InstructionData) -> Result<Self, Self::Error> {
        data.header.check()?;
        Ok(Intent {
            signer: data.public_key,
            message: Vec::<u8>::from(data.message)
                .try_into()
                .map_err(IntentError::ParseFailedError)?,
        })
    }
}

struct Ed25519InstructionData {
    header: Ed25519InstructionHeader,
    public_key: Pubkey,
    message: Message,
}

impl Ed25519InstructionData {
    fn slice_at(body: &[u8], offset: u16, len: u16) -> std::io::Result<&[u8]> {
        if offset < Ed25519InstructionHeader::LEN {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "offset before header",
            ));
        }
        let start = offset - Ed25519InstructionHeader::LEN;
        let end = usize::from(start)
            .checked_add(usize::from(len))
            .expect("adding two u16 can't overflow in usize");

        body.get(usize::from(start)..end).ok_or(std::io::Error::new(
            std::io::ErrorKind::UnexpectedEof,
            "offset out of bounds",
        ))
    }
}

impl BorshDeserialize for Ed25519InstructionData {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let header = Ed25519InstructionHeader::deserialize_reader(reader)?;
        let mut remaining = Vec::new();
        reader.read_to_end(&mut remaining)?;

        let public_key_bytes = Self::slice_at(&remaining, header.public_key_offset, 32)?;
        let public_key = Pubkey::new_from_array(
            public_key_bytes
                .try_into()
                .expect("public_key_bytes is 32 bytes"),
        );

        let signature_bytes = Self::slice_at(&remaining, header.signature_offset, 64)?;
        let mut signature = [0u8; 64];
        signature.copy_from_slice(signature_bytes);

        let message_bytes = Self::slice_at(
            &remaining,
            header.message_data_offset,
            header.message_data_size,
        )?;
        let message = Message::deserialize(message_bytes)?;
        Ok(Self {
            header,
            public_key,
            message,
        })
    }
}

#[derive(BorshDeserialize, PartialEq)]
struct Ed25519InstructionHeader {
    num_signatures: u8,
    padding: u8,
    signature_offset: u16,
    signature_instruction_index: u16,
    public_key_offset: u16,
    public_key_instruction_index: u16,
    message_data_offset: u16,
    message_data_size: u16,
    message_instruction_index: u16,
}

impl Ed25519InstructionHeader {
    const LEN: u16 = 1 + 1 + 2 + 2 + 2 + 2 + 2 + 2 + 2;

    fn check<E>(&self) -> Result<(), IntentError<E>> {
        let expected_header = Self {
            num_signatures: 1,
            padding: 0,
            signature_instruction_index: u16::MAX, // u16::MAX represents the current instruction
            public_key_instruction_index: u16::MAX,
            message_instruction_index: u16::MAX,
            message_data_size: self.message_data_size,
            signature_offset: self.signature_offset,
            public_key_offset: self.public_key_offset,
            message_data_offset: self.message_data_offset,
        };
        if self == &expected_header {
            Ok(())
        } else {
            Err(IntentError::SignatureVerificationUnexpectedHeader)
        }
    }
}

#[derive(Debug, PartialEq)]
pub enum Message {
    Raw(Vec<u8>),
    LegacyOffchain(LegacyOffchainMessage),
    Offchain(OffchainMessage),
}

impl From<Message> for Vec<u8> {
    fn from(message: Message) -> Self {
        match message {
            Message::Raw(message) => message,
            Message::LegacyOffchain(message) => message.get_message().to_vec(),
            Message::Offchain(message) => message.get_message().as_bytes().to_owned(),
        }
    }
}

fn get_length_with_header(message: &LegacyOffchainMessage) -> usize {
    match message {
        LegacyOffchainMessage::V0(_) => {
            message.get_message().len() + LegacyOffchainMessage::HEADER_LEN + 3
        }
    }
}

impl Message {
    pub fn deserialize(data: &[u8]) -> std::io::Result<Self> {
        match data.try_into() {
            Ok(message) => Ok(Self::Offchain(message)),
            _ => {
                if LegacyOffchainMessage::SIGNING_DOMAIN.len() <= data.len()
                    && data
                        .get(0..LegacyOffchainMessage::SIGNING_DOMAIN.len())
                        .expect("data.len() >= LegacyOffchainMessage::SIGNING_DOMAIN.len()")
                        == LegacyOffchainMessage::SIGNING_DOMAIN
                {
                    let message = LegacyOffchainMessage::deserialize(data).map_err(|_| {
                        std::io::Error::new(
                            std::io::ErrorKind::InvalidData,
                            "Invalid offchain message",
                        )
                    })?;
                    if data.len() > get_length_with_header(&message) {
                        return Err(std::io::Error::new(
                            std::io::ErrorKind::InvalidData,
                            "Not all bytes read",
                        )); // make it behave like try_from_slice, so it fails if all bytes are not read
                    }
                    Ok(Self::LegacyOffchain(message))
                } else {
                    Ok(Self::Raw(data.to_vec()))
                }
            }
        }
    }
}

#[derive(Debug)]
pub enum IntentError<P> {
    NoIntentMessageInstruction(ProgramError),
    IncorrectInstructionProgramId,
    SignatureVerificationUnexpectedHeader,
    ParseFailedError(P),
    DeserializeFailedError(borsh::io::Error),
}

impl<P> From<ProgramError> for IntentError<P> {
    fn from(err: ProgramError) -> Self {
        IntentError::NoIntentMessageInstruction(err)
    }
}

impl<P> From<borsh::io::Error> for IntentError<P> {
    fn from(err: borsh::io::Error) -> Self {
        IntentError::DeserializeFailedError(err)
    }
}

#[cfg(test)]
mod ed25519_tests {
    use super::*;
    use borsh::BorshDeserialize;
    use solana_program::pubkey::pubkey;

    fn build_header(
        signature_offset: u16,
        public_key_offset: u16,
        message_data_offset: u16,
        message_data_size: u16,
    ) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(usize::from(Ed25519InstructionHeader::LEN));
        bytes.push(1); // num_signatures
        bytes.push(0); // padding
        bytes.extend_from_slice(&signature_offset.to_le_bytes());
        bytes.extend_from_slice(&u16::MAX.to_le_bytes()); // signature_instruction_index
        bytes.extend_from_slice(&public_key_offset.to_le_bytes());
        bytes.extend_from_slice(&u16::MAX.to_le_bytes()); // public_key_instruction_index
        bytes.extend_from_slice(&message_data_offset.to_le_bytes());
        bytes.extend_from_slice(&message_data_size.to_le_bytes());
        bytes.extend_from_slice(&u16::MAX.to_le_bytes()); // message_instruction_index
        bytes
    }

    #[test]
    fn test_deserialize_offchain_message_public_key_offset_inside_message() {
        let signer_0 = pubkey!("WiABAtWkKuKfpT2U8FKcjMdxoiMLjED8jHA6VNZ7NEm");
        let signer_1 = pubkey!("865UEUDXB7h2XcPtnkpGS2DPhe9Y58r6RFCAhG4UE1iN");
        let signer_2 = pubkey!("Eticpp6xSX8oQESNactDVg631mjcZMwSYc3Tz2efRTeQ");

        let message_bytes = [
            b"\xffsolana offchain".to_vec(),
            vec![1],
            vec![3],
            signer_0.to_bytes().to_vec(),
            signer_1.to_bytes().to_vec(),
            signer_2.to_bytes().to_vec(),
            b"foobarbaz".to_vec(),
        ]
        .concat();

        let header_len = Ed25519InstructionHeader::LEN;
        let message_data_offset = header_len;
        let public_key_offset = header_len + 16 + 1 + 1; // inside message, at first signer
        let signature_offset = header_len + u16::try_from(message_bytes.len()).unwrap();
        let message_data_size = u16::try_from(message_bytes.len()).unwrap();

        let mut data = build_header(
            signature_offset,
            public_key_offset,
            message_data_offset,
            message_data_size,
        );

        data.extend_from_slice(&message_bytes);
        let expected_signature = [7u8; 64];
        data.extend_from_slice(&expected_signature);

        let decoded = Ed25519InstructionData::try_from_slice(&data).unwrap();

        assert_eq!(decoded.public_key, signer_0);
        let expected = OffchainMessage::try_from(message_bytes.as_ref()).unwrap();
        assert_eq!(decoded.message, Message::Offchain(expected));
    }

    #[test]
    fn test_deserialize_standard_layout_public_key_signature_message() {
        let public_key = pubkey!("2xg8b2Qz5sSPhhYh1spuZB3ux1o4d2d5UXJ8gQSdG6Ef");
        let signature = [42u8; 64];
        let message_bytes = b"hello".to_vec();

        let header_len = Ed25519InstructionHeader::LEN;
        let public_key_offset = header_len;
        let signature_offset = header_len + 32;
        let message_data_offset = header_len + 32 + 64;
        let message_data_size = u16::try_from(message_bytes.len()).unwrap();

        let mut data = build_header(
            signature_offset,
            public_key_offset,
            message_data_offset,
            message_data_size,
        );

        data.extend_from_slice(&public_key.to_bytes());
        data.extend_from_slice(&signature);
        data.extend_from_slice(&message_bytes);

        let decoded = Ed25519InstructionData::try_from_slice(&data).unwrap();

        assert_eq!(decoded.public_key, public_key);
        assert_eq!(decoded.message, Message::Raw(message_bytes));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_offchain_message_roundtrip() {
        let offchain_message = LegacyOffchainMessage::new(0, "Fogo Sessions".as_bytes()).unwrap();
        assert_eq!(
            Message::deserialize(&offchain_message.serialize().unwrap()).unwrap(),
            Message::LegacyOffchain(offchain_message.clone())
        );
    }

    #[test]
    fn test_offchain_message_short() {
        let offchain_message = LegacyOffchainMessage::new(0, "Fogo Sessions".as_bytes()).unwrap();

        let mut message_serialized_short: Vec<u8> = offchain_message.serialize().unwrap();
        message_serialized_short.pop();

        assert_eq!(
            Message::deserialize(&message_serialized_short)
                .unwrap_err()
                .kind(),
            std::io::ErrorKind::InvalidData
        );
    }

    #[test]
    fn test_offchain_message_long() {
        let offchain_message = LegacyOffchainMessage::new(0, "Fogo Sessions".as_bytes()).unwrap();

        let message_serialized_long: Vec<u8> = offchain_message
            .serialize()
            .unwrap()
            .into_iter()
            .chain(std::iter::once(0u8))
            .collect();

        assert_eq!(
            Message::deserialize(&message_serialized_long)
                .unwrap_err()
                .kind(),
            std::io::ErrorKind::InvalidData
        );
    }

    #[test]
    fn test_raw_message() {
        let message = b"Fogo Sessions"; // shorter than SIGNING_DOMAIN
        assert_eq!(
            Message::deserialize(message).unwrap(),
            Message::Raw(message.to_vec())
        );
    }

    #[test]
    fn test_raw_message_long() {
        let message = b"Fogo Sessions Fogo Sessions Fogo Sessions";
        assert_eq!(
            Message::deserialize(message).unwrap(),
            Message::Raw(message.to_vec())
        );
    }
}
