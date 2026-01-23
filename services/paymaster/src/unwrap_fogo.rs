use solana_client::{nonblocking::rpc_client::RpcClient, rpc_config::RpcSendTransactionConfig};
use solana_commitment_config::CommitmentLevel;
use solana_keypair::Keypair;
use solana_message::{v0::Message as MessageV0, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;

use crate::{
    api::PubsubClientWithReconnect,
    rpc::{send_and_confirm_transaction, ConfirmationResultInternal, SignedVersionedTransaction},
};

/// Submits a transaction to unwrap WFOGO SPL tokens into FOGO.
pub async fn unwrap_fogo(
    owner: &Keypair,
    rpc: &RpcClient,
    pubsub: &PubsubClientWithReconnect,
) -> anyhow::Result<ConfirmationResultInternal> {
    let owner_pubkey = owner.pubkey();
    let wfogo_ata = spl_associated_token_account::get_associated_token_address(
        &owner_pubkey,
        &spl_token::native_mint::ID,
    );

    let close_ix = spl_token::instruction::close_account(
        &spl_token::id(),
        &wfogo_ata,
        &owner_pubkey,
        &owner_pubkey,
        &[],
    )?;

    let recent_blockhash = rpc.get_latest_blockhash().await?;
    let message = MessageV0::try_compile(&owner_pubkey, &[close_ix], &[], recent_blockhash)?;

    let transaction = VersionedTransaction {
        signatures: vec![Default::default()],
        message: VersionedMessage::V0(message),
    };

    let signature = owner.sign_message(&transaction.message.serialize());
    let signed_transaction = SignedVersionedTransaction::new(transaction, signature)?;

    let rpc_config = RpcSendTransactionConfig {
        skip_preflight: true,
        preflight_commitment: Some(CommitmentLevel::Processed),
        ..RpcSendTransactionConfig::default()
    };
    send_and_confirm_transaction(rpc, pubsub, &signed_transaction, rpc_config)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to unwrap WFOGO: {:?}", e))
}
