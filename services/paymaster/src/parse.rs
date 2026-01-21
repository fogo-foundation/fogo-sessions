use anyhow::Context;
use base64::prelude::*;
use solana_transaction::versioned::VersionedTransaction;

pub fn parse_transaction_from_base64(encoded_tx: &str) -> anyhow::Result<VersionedTransaction> {
    let tx_bytes = BASE64_STANDARD
        .decode(encoded_tx)
        .context("Failed to decode base64 transaction")?;

    let (transaction, _) =
        bincode::serde::decode_from_slice(&tx_bytes, bincode::config::standard())
            .context("Failed to deserialize transaction")?;
    Ok(transaction)
}