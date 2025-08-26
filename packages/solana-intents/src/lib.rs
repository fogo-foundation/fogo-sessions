use borsh::BorshDeserialize;
use solana_program::{
    account_info::AccountInfo, ed25519_program, instruction::Instruction,
    program_error::ProgramError, pubkey::Pubkey, sysvar::instructions::get_instruction_relative,
};

pub mod key_value;
pub mod symbol_or_mint;
pub mod version;

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
        if data.header.check() {
            Ok(Intent {
                signer: data.public_key,
                message: data
                    .message
                    .try_into()
                    .map_err(IntentError::ParseFailedError)?,
            })
        } else {
            Err(IntentError::SignatureVerificationUnexpectedHeader)
        }
    }
}

struct Ed25519InstructionData {
    header: Ed25519InstructionHeader,
    public_key: Pubkey,
    _signature: [u8; 64], // We don't check the signature here, the ed25519 program is responsible for that
    message: Vec<u8>,
}

impl BorshDeserialize for Ed25519InstructionData {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let header = Ed25519InstructionHeader::deserialize_reader(reader)?;
        let public_key = Pubkey::deserialize_reader(reader)?;
        let mut signature = [0u8; 64];
        reader.read_exact(&mut signature)?;
        let mut message: Vec<u8> = vec![0u8; header.message_data_size as usize];
        reader.read_exact(&mut message)?;
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
