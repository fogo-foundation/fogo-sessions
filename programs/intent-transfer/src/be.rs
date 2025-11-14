use anchor_lang::{AnchorDeserialize, AnchorSerialize};

pub struct U16BE(pub u16);

impl AnchorDeserialize for U16BE {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let mut buf = [0u8; 2];
        reader.read_exact(&mut buf)?;
        Ok(U16BE(u16::from_be_bytes(buf)))
    }
}

impl AnchorSerialize for U16BE {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        writer.write_all(&self.0.to_be_bytes())
    }
}

impl From<U16BE> for u128 {
    fn from(value: U16BE) -> u128 {
        u128::from(value.0)
    }
}

pub struct U64BE(pub u64);

impl AnchorDeserialize for U64BE {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let mut buf = [0u8; 8];
        reader.read_exact(&mut buf)?;
        Ok(U64BE(u64::from_be_bytes(buf)))
    }
}

impl AnchorSerialize for U64BE {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        writer.write_all(&self.0.to_be_bytes())
    }
}

impl From<U64BE> for u128 {
    fn from(value: U64BE) -> u128 {
        u128::from(value.0)
    }
}
