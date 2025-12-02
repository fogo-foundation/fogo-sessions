use borsh::BorshDeserialize;
use solana_offchain_message::OffchainMessage;
use solana_program::{
    account_info::AccountInfo, ed25519_program, instruction::Instruction,
    program_error::ProgramError, pubkey::Pubkey, sysvar::instructions::get_instruction_relative,
};

mod key_value;
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
    _signature: [u8; 64], // We don't check the signature here, the ed25519 program is responsible for that
    message: Message,
}

impl BorshDeserialize for Ed25519InstructionData {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let header = Ed25519InstructionHeader::deserialize_reader(reader)?;
        let public_key = Pubkey::deserialize_reader(reader)?;
        let mut signature = [0u8; 64];
        reader.read_exact(&mut signature)?;
        let mut message_bytes: Vec<u8> = vec![0u8; usize::from(header.message_data_size)];
        reader.read_exact(&mut message_bytes)?;
        let message = Message::deserialize(&message_bytes)?;
        Ok(Self {
            header,
            public_key,
            _signature: signature,
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
            signature_offset: Self::LEN + 32,
            signature_instruction_index: u16::MAX, // u16::MAX represents the current instruction
            public_key_offset: Self::LEN,
            public_key_instruction_index: u16::MAX,
            message_data_offset: Self::LEN + 32 + 64,
            message_instruction_index: u16::MAX,
            message_data_size: self.message_data_size,
        };
        if self == &expected_header {
            Ok(())
        } else {
            Err(IntentError::SignatureVerificationUnexpectedHeader)
        }
    }
}

#[derive(Debug, PartialEq)]
enum Message {
    Raw(Vec<u8>),
    OffchainMessage(OffchainMessage),
}

impl From<Message> for Vec<u8> {
    fn from(message: Message) -> Self {
        match message {
            Message::Raw(message) => message,
            Message::OffchainMessage(message) => message.get_message().to_vec(),
        }
    }
}

fn get_length_with_header(message: &OffchainMessage) -> usize {
    match message {
        OffchainMessage::V0(_) => message.get_message().len() + OffchainMessage::HEADER_LEN + 3,
    }
}

impl Message {
    fn deserialize(data: &[u8]) -> std::io::Result<Self> {
        if OffchainMessage::SIGNING_DOMAIN.len() <= data.len()
            && data[0..OffchainMessage::SIGNING_DOMAIN.len()] == *OffchainMessage::SIGNING_DOMAIN
        {
            let message = OffchainMessage::deserialize(data).map_err(|_| {
                std::io::Error::new(std::io::ErrorKind::InvalidData, "Invalid offchain message")
            })?;
            if data.len() > get_length_with_header(&message) {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "Not all bytes read",
                )); // make it behave like try_from_slice, so it fails if all bytes are not read
            }
            Ok(Self::OffchainMessage(message))
        } else {
            Ok(Self::Raw(data.to_vec()))
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
mod tests {
    use super::*;

    #[test]
    fn test_offchain_message_roundtrip() {
        let offchain_message = OffchainMessage::new(0, "Fogo Sessions".as_bytes()).unwrap();
        assert_eq!(
            Message::deserialize(&offchain_message.serialize().unwrap()).unwrap(),
            Message::OffchainMessage(offchain_message.clone())
        );
    }

    #[test]
    fn test_offchain_message_short() {
        let offchain_message = OffchainMessage::new(0, "Fogo Sessions".as_bytes()).unwrap();

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
        let offchain_message = OffchainMessage::new(0, "Fogo Sessions".as_bytes()).unwrap();

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
