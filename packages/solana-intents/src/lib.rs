use borsh::BorshDeserialize;
use solana_offchain_message::{OffchainMessage};
use solana_program::{
    account_info::AccountInfo, ed25519_program, instruction::Instruction,
    program_error::ProgramError, pubkey::Pubkey, sysvar::instructions::get_instruction_relative,
};
use std::io::Read;

mod key_value;
mod symbol_or_mint;
mod version;

pub use key_value::{key_value, tag_key_value};
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
        if !data.header.check() {
            return Err(IntentError::SignatureVerificationUnexpectedHeader);
        }
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
        let message = Message::try_from_slice(message_bytes.as_slice())?; // try_from_slice so it fails if all bytes are not read
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

    fn check(&self) -> bool {
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
        self == &expected_header
    }
}

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

fn get_total_length(message: &OffchainMessage) -> usize {
    match message {
        OffchainMessage::V0(_) => message.get_message().len() + OffchainMessage::HEADER_LEN + 3,
    }
}

impl BorshDeserialize for Message {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let mut maybe_offchain_message_prefix = [0u8; 16];
        reader.read_exact(&mut maybe_offchain_message_prefix)?;
        if maybe_offchain_message_prefix == OffchainMessage::SIGNING_DOMAIN {
            let mut message_bytes = vec![];
            maybe_offchain_message_prefix
                .chain(reader)
                .read_to_end(&mut message_bytes)?;

            let message = OffchainMessage::deserialize(&message_bytes).map_err(|_| {
                std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "Invalid ledger offchain message",
                )
            })?;

            if message_bytes.len() > get_total_length(&message) {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "Not all bytes read",
                )); // make it behave like try_from_slice, so it fails if all bytes are not read
            }
            Ok(Self::OffchainMessage(message))
        } else {
            let mut message = vec![];
            maybe_offchain_message_prefix
                .chain(reader)
                .read_to_end(&mut message)?;
            Ok(Self::Raw(message))
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
