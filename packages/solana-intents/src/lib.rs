use std::io::Read;

use borsh::BorshDeserialize;
use solana_program::{
    account_info::AccountInfo, ed25519_program, instruction::Instruction,
    program_error::ProgramError, pubkey::Pubkey, sysvar::instructions::get_instruction_relative,
};

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
        if !data.message.check() {
            return Err(IntentError::SignatureVerificationUnexpectedHeader);
        }
            Ok(Intent {
                signer: data.public_key,
                message: Vec::<u8>::from(data
                    .message
                     )
                    .try_into()
                    .map_err(IntentError::ParseFailedError)?,
            })
    }
}

struct Ed25519InstructionData {
    header: Ed25519InstructionHeader,
    public_key: Pubkey,
    _signature: [u8; 64], // We don't check the signature here, the ed25519 program is responsible for that
    message: OffchainMessage,
}

impl BorshDeserialize for Ed25519InstructionData {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let header = Ed25519InstructionHeader::deserialize_reader(reader)?;
        let public_key = Pubkey::deserialize_reader(reader)?;
        let mut signature = [0u8; 64];
        reader.read_exact(&mut signature)?;
        let mut message_bytes: Vec<u8> = vec![0u8; header.message_data_size as usize];
        reader.read_exact(&mut message_bytes)?;
        let message = OffchainMessage::try_from_slice(message_bytes.as_slice())?;
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

const LEDGER_PREFIX: &[u8] = b"\xffsolana offchain";

enum OffchainMessage {
    Raw(Vec<u8>),
    Ledger(LedgerOffchainMessage),
}

impl From<OffchainMessage> for Vec<u8> {
    fn from(message: OffchainMessage) -> Self {
        match message {
            OffchainMessage::Raw(message) => message,
            OffchainMessage::Ledger(message) => message.message.0,
        }
    }
}

impl OffchainMessage {
    pub fn check(&self) -> bool {
        match self {
            Self::Raw(_) => true,
            Self::Ledger(message) => message.version == 0 && ((message.format == 0 && message.message.0.is_ascii()) || (message.format == 1 && std::str::from_utf8(&message.message.0).is_ok())),
        }
    }
}

impl BorshDeserialize for OffchainMessage {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let mut maybe_ledger_prefix = [0u8; 16];
        reader.read_exact(&mut maybe_ledger_prefix)?;
        if maybe_ledger_prefix == LEDGER_PREFIX {
            Ok(Self::Ledger(LedgerOffchainMessage::deserialize_reader(reader)?))
        } else {
            let mut message = vec![];
            (&mut maybe_ledger_prefix.chain(reader)).read_to_end(&mut message)?;
            Ok(Self::Raw(message))
        }
    }
}

#[derive(BorshDeserialize)]
struct LedgerOffchainMessage {
    version: u8,
    format: u8,
    message: ShortVec<u8>,
}

struct ShortVec<T> (Vec<T>);

impl<T> BorshDeserialize for ShortVec<T> where T: BorshDeserialize {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let length = u16::deserialize_reader(reader)?;
        let mut result = Vec::with_capacity(length as usize);
        for _ in 0..length {
            result.push(T::deserialize_reader(reader)?);
        }
        Ok(Self(result))
    }
}



#[derive(Debug)]
pub enum IntentError<P> {
    NoIntentMessageInstruction(ProgramError),
    IncorrectInstructionProgramId,
    SignatureVerificationUnexpectedHeader,
    LedgerOffchainMessageUnexpectedHeader,
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
