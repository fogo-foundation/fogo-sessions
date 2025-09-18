use borsh::BorshDeserialize;

// source: https://github.com/LedgerHQ/app-solana/blob/bdb2fd6d6bf52ba1fe9f216bcf00b6eebd118308/src/handle_sign_offchain_message.c#L85
#[derive(BorshDeserialize)]
pub struct LedgerOffchainMessage {
    _version: Version,
    format: Format,
    message: ShortVec<u8>,
}

#[derive(BorshDeserialize)]
enum Version {
    V0,
}

#[derive(BorshDeserialize, PartialEq)]
enum Format {
    Ascii,
    Utf8,
}

struct ShortVec<T>(Vec<T>);

impl<T> BorshDeserialize for ShortVec<T>
where
    T: BorshDeserialize,
{
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let length = u16::deserialize_reader(reader)?;
        let mut result = Vec::with_capacity(usize::from(length));
        for _ in 0..length {
            result.push(T::deserialize_reader(reader)?);
        }
        Ok(Self(result))
    }
}

impl LedgerOffchainMessage {
    pub const MAX_MESSAGE_LENGTH: usize = 1212;

    pub fn check(&self) -> bool {
        self.message.0.len() <= Self::MAX_MESSAGE_LENGTH
            && ((self.format == Format::Ascii && self.message.0.is_ascii())
                || (self.format == Format::Utf8
                    && std::str::from_utf8(&self.message.0).is_ok()))
    }
}

impl From<LedgerOffchainMessage> for Vec<u8> {
    fn from(message: LedgerOffchainMessage) -> Self {
        message.message.0
    }
}