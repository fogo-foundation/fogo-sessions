use anchor_lang::prelude::*;

fn verify_symbol_or_mint(
    symbol_or_mint: &SymbolOrMint,
    metadata: &Option<UncheckedAccount>,
    mint: &Account<Mint>,
) -> Result<()> {
    match (symbol_or_mint, metadata) {
        (SymbolOrMint::Symbol(ref symbol), Some(metadata)) => {
            require_keys_eq!(
                metadata.key(),
                Metadata::find_pda(&mint.key()).0,
                IntentTransferError::MetadataMismatch
            );
            require_eq!(
                &Metadata::try_from(&metadata.to_account_info())?.symbol,
                // Symbols in the metadata account are padded to 10 characters
                &format!("{symbol:\0<10}"),
                IntentTransferError::SymbolMismatch
            );
        }

        (SymbolOrMint::Symbol(_), None) => {
            return err!(IntentTransferError::MetadataAccountRequired);
        }

        (SymbolOrMint::Mint(ref expected_mint), None) => {
            require_keys_eq!(
                *expected_mint,
                mint.key(),
                IntentTransferError::MintMismatch
            );
        }

        (SymbolOrMint::Mint(_), Some(_)) => {
            return err!(IntentTransferError::MetadataAccountNotAllowed);
        }
    }
    Ok(())
}

fn verify_signer_matches_source(signer: Pubkey, source_owner: Pubkey) -> Result<()> {
    require_keys_eq!(
        signer,
        source_owner,
        IntentTransferError::SignerSourceMismatch
    );
    Ok(())
}

fn verify_and_update_nonce(nonce: &mut Account<Nonce>, new_nonce: u64) -> Result<()> {
    require_eq!(
        new_nonce,
        nonce.nonce + 1,
        IntentTransferError::NonceFailure
    );
    nonce.nonce = new_nonce;
    Ok(())
}