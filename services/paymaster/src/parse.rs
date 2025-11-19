use intent_transfer::bridge::processor::bridge_ntt_tokens::H160;

pub fn parse_h160(address: &str) -> anyhow::Result<H160> {
    let hex_str = address.strip_prefix("0x").unwrap_or(address);

    let bytes =
        hex::decode(hex_str).map_err(|e| anyhow::anyhow!("Invalid hex string {hex_str}: {e}"))?;

    bytes.try_into().map_err(|_| {
        anyhow::anyhow!("Failed to convert bytes to H160 address: invalid byte array length")
    })
}
