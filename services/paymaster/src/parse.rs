use intent_transfer::bridge::processor::bridge_ntt_tokens::H160;

pub fn parse_h160(address: &str) -> Result<H160, String> {
    let hex_str = address.strip_prefix("0x").unwrap_or(address);

    let bytes = hex::decode(hex_str).map_err(|e| format!("Invalid hex string: {e}"))?;

    if bytes.len() != 20 {
        return Err(format!(
            "Address must be 20 bytes, got {} bytes",
            bytes.len()
        ));
    }

    bytes
        .try_into()
        .map_err(|_| "Failed to convert to fixed array".to_string())
}
