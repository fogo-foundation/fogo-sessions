use crate::{error::SessionManagerError, intents::message::Message, StartSession};
use anchor_lang::solana_program::ed25519_program;
use anchor_lang::{prelude::*, solana_program::sysvar::instructions::load_instruction_at_checked};

pub struct Intent {
    pub signer: Pubkey,
    pub message: Message,
}

#[derive(AnchorDeserialize, PartialEq)]
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

struct Ed25519InstructionData {
    header: Ed25519InstructionHeader,
    public_key: Pubkey,
    _signature: [u8; 64], // We don't check the signature here, the ed25519 program is responsible for that
    message: Message,
}

impl AnchorDeserialize for Ed25519InstructionData {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let header = Ed25519InstructionHeader::deserialize_reader(reader)?;
        let mut signature = [0u8; 64];
        reader.read_exact(&mut signature)?;
        let public_key = Pubkey::deserialize_reader(reader)?;
        let mut message: Vec<u8> = vec![0u8; header.message_data_size as usize];
        reader.read_exact(&mut message)?;
        Ok(Self {
            header,
            public_key,
            _signature: signature,
            message: Message(message),
        })
    }
}

impl<'info> StartSession<'info> {
    pub fn verify_intent(&self) -> Result<Intent> {
        // TODO: Let the user pass the instruction index
        let instruction_data = load_instruction_at_checked(0, &self.sysvar_instructions)?;

        if !instruction_data.program_id.eq(&ed25519_program::ID) {
            return Err(error!(SessionManagerError::InvalidArgument));
        }

        let Ed25519InstructionData {
            message,
            public_key,
            header,
            ..
        } = Ed25519InstructionData::try_from_slice(&instruction_data.data)?;

        if !header.check() {
            return Err(error!(SessionManagerError::InvalidArgument));
        }

        Ok(Intent {
            signer: public_key,
            message,
        })
    }
}
