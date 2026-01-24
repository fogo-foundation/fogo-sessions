use anyhow::Context;
use futures::future::join_all;
use rand::distr::{Bernoulli, Distribution};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_with::{serde_as, DisplayFromStr};
use solana_client::{nonblocking::rpc_client::RpcClient, rpc_config::RpcSendTransactionConfig};
use solana_commitment_config::CommitmentLevel;
use solana_keypair::Keypair;
use solana_message::{legacy::Message, v0::Message as MessageV0, VersionedMessage};
use solana_program::instruction::{AccountMeta, Instruction};
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use solana_transaction::{versioned::VersionedTransaction, Transaction};
use std::str::FromStr;
use url::{form_urlencoded, Url};

use crate::{
    api::{PubsubClientWithReconnect, ValiantClient},
    cli::NetworkEnvironment,
    constraint::MintSwapRate,
    parse::parse_transaction_from_base64,
    rpc::{
        get_spl_ata_balance, send_and_confirm_transaction, ConfirmationResultInternal,
        SignedVersionedTransaction,
    },
    serde::{deserialize_pubkey_vec, serialize_pubkey_vec},
};

pub const VALIANT_URL_MAINNET: &str = "https://mainnet-pro-api.valiant.trade";
pub const VALIANT_URL_TESTNET: &str = "https://api.valiant.trade";
pub const MAX_SLIPPAGE_BPS: u64 = 50;
pub const PERCENTAGE_TO_SWAP_BPS: u64 = 9900;

// NOTE: the params and response types below are manually defined for an external API.
// This external API could change in the future, which could break our integration.
// Additionally note that we leave out certain fields that are not relevant to our use case.
// For reference, please see the Valiant API docs at https://mainnet-api.valiant.trade/docs.

#[serde_as]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TwoHopQuoteParams {
    #[serde_as(as = "DisplayFromStr")]
    input_mint: Pubkey,
    #[serde_as(as = "DisplayFromStr")]
    output_mint: Pubkey,
    input_amount: u64,
    is_exact_in: bool,
    direct_only: bool,
}

#[serde_as]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TwoHopQuoteResponse {
    #[serde_as(as = "DisplayFromStr")]
    token_est_out: u64,
    quote: TwoHopQuote,
}

#[serde_as]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TwoHopQuote {
    #[serde(deserialize_with = "deserialize_pubkey_vec")]
    route: Vec<Pubkey>,
    #[serde(deserialize_with = "deserialize_pubkey_vec")]
    pools: Vec<Pubkey>,
}

#[serde_as]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TwoHopSwapParams {
    #[serde_as(as = "DisplayFromStr")]
    user_address: Pubkey,
    #[serde(serialize_with = "serialize_pubkey_vec")]
    route: Vec<Pubkey>,
    #[serde(serialize_with = "serialize_pubkey_vec")]
    pools: Vec<Pubkey>,
    is_exact_in: bool,
    input_amount: u64,
    output_amount: u64,
    use_alt: bool,
    include_fee: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TwoHopSwapResponse {
    serialized_tx: String,
}

/// Builds the query string for the twoHopSwap request from the params object.
/// We build the query string manually here because reqwest/serde currently
/// don't support serialization of Vec<T> into depth-0 params with the same name.
fn build_swap_query_string(params: &TwoHopSwapParams) -> String {
    let mut serializer = form_urlencoded::Serializer::new(String::new());
    serializer.append_pair("userAddress", &params.user_address.to_string());
    serializer.append_pair("inputAmount", &params.input_amount.to_string());
    serializer.append_pair("outputAmount", &params.output_amount.to_string());
    for pubkey in &params.route {
        serializer.append_pair("route", &pubkey.to_string());
    }
    for pubkey in &params.pools {
        serializer.append_pair("pools", &pubkey.to_string());
    }
    serializer.append_pair("isExactIn", &params.is_exact_in.to_string());
    serializer.append_pair("useAlt", &params.use_alt.to_string());
    serializer.append_pair("includeFee", &params.include_fee.to_string());
    serializer.finish()
}

pub struct SwapConfirmationResult {
    pub mint: Pubkey,
    pub confirmation: ConfirmationResultInternal,
}

impl ValiantClient {
    /// Creates a new ValiantClient from the given parameters.
    pub fn from_params(
        api_key: &str,
        network_environment: NetworkEnvironment,
        valiant_url_override: Option<String>,
    ) -> anyhow::Result<Self> {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            "X-API-KEY",
            reqwest::header::HeaderValue::from_str(api_key)?,
        );
        let client = Client::builder().default_headers(headers).build()?;
        let base_url = if let Some(override_url) = valiant_url_override {
            Url::from_str(&override_url)
        } else {
            match network_environment {
                NetworkEnvironment::Mainnet => Url::from_str(VALIANT_URL_MAINNET),
                NetworkEnvironment::Testnet => Url::from_str(VALIANT_URL_TESTNET),
                NetworkEnvironment::Localnet => {
                    return Err(anyhow::anyhow!("Localnet Valiant is not supported"))
                }
            }
        }?;
        Ok(ValiantClient { client, base_url })
    }

    /// Swaps tokens into FOGO based on sampling using the provided mint swap rates.
    /// If the sample is successful, constructs and submits a swap transaction.
    /// Returns a vector of confirmation results, one per attempted swap.
    /// Note this could return a smaller vector than the number of input mint swap rates.
    pub async fn swap_tokens_probabilistic(
        &self,
        mint_swap_rates: &[MintSwapRate],
        transaction_sponsor: &Keypair,
        rpc: &RpcClient,
        pubsub: &PubsubClientWithReconnect,
    ) -> Vec<anyhow::Result<SwapConfirmationResult>> {
        let futures = mint_swap_rates.iter().filter_map(|mint_swap_rate| {
            if mint_swap_rate.sample() {
                Some(self.swap_token(mint_swap_rate.mint(), transaction_sponsor, rpc, pubsub))
            } else {
                None
            }
        });
        join_all(futures).await
    }

    async fn swap_token(
        &self,
        mint: Pubkey,
        transaction_sponsor: &Keypair,
        rpc: &RpcClient,
        pubsub: &PubsubClientWithReconnect,
    ) -> anyhow::Result<SwapConfirmationResult> {
        let paymaster_wallet_key = transaction_sponsor.pubkey();
        let spl_balance = get_spl_ata_balance(rpc, &paymaster_wallet_key, &mint).await?;
        // TODO: this is necessary for mainnet bc include_fee needs to be set to true for now
        // As a result, the Valiant paymaster takes a small fee from the swap, in the input token for USDC/FISH/FOGO.
        // Eventually, if we are supporting other tokens, the Valiant fee will be charged in WFOGO, so this patch
        // WILL NOT WORK. But we expect the Valiant API to be fixed shortly.
        let amount_to_swap = spl_balance * PERCENTAGE_TO_SWAP_BPS / 10_000;
        let swap_transaction = self
            .get_valiant_swap_transaction(mint, amount_to_swap, &paymaster_wallet_key)
            .await?;

        let signature = transaction_sponsor.sign_message(&swap_transaction.message.serialize());
        let signed_transaction = SignedVersionedTransaction::new(swap_transaction, signature)
            .map_err(|e| anyhow::anyhow!("Failed to sign swap transaction: {}", e))?;

        let rpc_config = RpcSendTransactionConfig {
            skip_preflight: true,
            preflight_commitment: Some(CommitmentLevel::Processed),
            ..RpcSendTransactionConfig::default()
        };
        let confirmation_result =
            send_and_confirm_transaction(rpc, pubsub, &signed_transaction, rpc_config)
                .await
                .map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to send and confirm swap transaction for mint {}: {:?}",
                        mint,
                        e
                    )
                })?;
        Ok(SwapConfirmationResult {
            mint,
            confirmation: confirmation_result,
        })
    }

    async fn get_valiant_swap_transaction(
        &self,
        mint_in: Pubkey,
        amount_in: u64,
        transaction_sponsor_pubkey: &Pubkey,
    ) -> anyhow::Result<VersionedTransaction> {
        let quote_response = self.get_two_hop_quote(mint_in, amount_in).await?;
        let amount_out_min = quote_response
            .token_est_out
            .checked_mul(10_000 - MAX_SLIPPAGE_BPS)
            .context("Overflow on minimum output amount calculation")?
            / 10_000;

        let swap_response = self
            .get_two_hop_swap(
                transaction_sponsor_pubkey,
                amount_in,
                amount_out_min,
                quote_response.quote.route.clone(),
                quote_response.quote.pools,
            )
            .await?;

        let transaction = parse_transaction_from_base64(&swap_response.serialized_tx)?;

        add_create_idempotent_instructions(
            transaction,
            quote_response.quote.route,
            transaction_sponsor_pubkey,
        )
    }

    /// Queries the /dex/twoHopQuote Valiant endpoint to retrieve quote details.
    /// These quote details will inform the swap transaction construction.
    async fn get_two_hop_quote(
        &self,
        mint_in: Pubkey,
        amount_in: u64,
    ) -> anyhow::Result<TwoHopQuoteResponse> {
        let params = TwoHopQuoteParams {
            input_mint: mint_in,
            output_mint: spl_token::native_mint::ID,
            input_amount: amount_in,
            is_exact_in: true,
            direct_only: false,
        };

        let response = self
            .client
            .get(self.base_url.join("/dex/twoHopQuote")?)
            .query(&params)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        Ok(response)
    }

    /// Queries the /dex/txs/twoHopSwap endpoint to retrieve a swap transaction.
    async fn get_two_hop_swap(
        &self,
        pubkey: &Pubkey,
        amount_in: u64,
        amount_out_min: u64,
        route: Vec<Pubkey>,
        pools: Vec<Pubkey>,
    ) -> anyhow::Result<TwoHopSwapResponse> {
        let params = TwoHopSwapParams {
            user_address: *pubkey,
            input_amount: amount_in,
            output_amount: amount_out_min,
            route,
            pools,
            is_exact_in: true,
            use_alt: true,
            // Valiant's API is being improved, once it returns a valid tx with all the createIdempotents necessary, we can disable this flag.
            // We should also swap the full balance once this is reverted to false.
            include_fee: true,
        };

        let query_string = build_swap_query_string(&params);

        let mut url = self.base_url.join("/dex/txs/twoHopSwap")?;
        url.set_query(Some(&query_string));

        let response = self
            .client
            .get(url)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        Ok(response)
    }
}

impl MintSwapRate {
    fn sample(&self) -> bool {
        let rv = Bernoulli::new(self.rate());
        // this should always be okay, since 0 <= rate <= 1
        if let Ok(bern) = rv {
            return bern.sample(&mut rand::rng());
        }
        false
    }
}

// We need to manually add create idempotents to ensure that ATAs for all of the tokens in the route exist.
// We can just create for all the tokens except first and last in the route.
// The first should already have a non-empty ATA since we are trying to swap those tokens.
// The last should already have an ATA created via the API tx.
fn add_create_idempotent_instructions(
    transaction: VersionedTransaction,
    route: Vec<Pubkey>,
    transaction_sponsor_pubkey: &Pubkey,
) -> anyhow::Result<VersionedTransaction> {
    let create_ata_ixs: Vec<_> = route
        .iter()
        .skip(1)
        .take(route.len().saturating_sub(2))
        .map(|mint| {
            spl_associated_token_account::instruction::create_associated_token_account_idempotent(
                transaction_sponsor_pubkey,
                transaction_sponsor_pubkey,
                mint,
                &spl_token::id(),
            )
        })
        .collect();

    match &transaction.message {
        VersionedMessage::V0(message_v0) => {
            add_instructions_to_v0(message_v0, create_ata_ixs, transaction_sponsor_pubkey)
        }
        VersionedMessage::Legacy(message) => {
            add_instructions_to_legacy(message, create_ata_ixs, transaction_sponsor_pubkey)
        }
    }
}

fn add_instructions_to_v0(
    message_v0: &MessageV0,
    create_ata_ixs: Vec<Instruction>,
    transaction_sponsor_pubkey: &Pubkey,
) -> anyhow::Result<VersionedTransaction> {
    let account_keys = &message_v0.account_keys;
    let header = &message_v0.header;

    let is_signer = |idx: usize| idx < usize::from(header.num_required_signatures);

    let existing_ixs: anyhow::Result<Vec<_>> = message_v0
        .instructions
        .iter()
        .map(|compiled_ix| {
            let program_id = *account_keys
                .get(usize::from(compiled_ix.program_id_index))
                .ok_or_else(|| anyhow::anyhow!("Invalid program id index"))?;
            let accounts: anyhow::Result<Vec<_>> = compiled_ix
                .accounts
                .iter()
                .map(|&idx| {
                    let idx = usize::from(idx);
                    Ok(AccountMeta {
                        pubkey: *account_keys
                            .get(idx)
                            .ok_or_else(|| anyhow::anyhow!("Invalid account index"))?,
                        is_signer: is_signer(idx),
                        is_writable: message_v0.is_maybe_writable(idx, None),
                    })
                })
                .collect();
            Ok(Instruction {
                program_id,
                accounts: accounts?,
                data: compiled_ix.data.clone(),
            })
        })
        .collect();

    let all_ixs: Vec<_> = create_ata_ixs.into_iter().chain(existing_ixs?).collect();

    let new_message = MessageV0::try_compile(
        transaction_sponsor_pubkey,
        &all_ixs,
        &[],
        message_v0.recent_blockhash,
    )?;

    Ok(VersionedTransaction {
        signatures: vec![Default::default()],
        message: VersionedMessage::V0(new_message),
    })
}

fn add_instructions_to_legacy(
    message: &Message,
    create_ata_ixs: Vec<Instruction>,
    transaction_sponsor_pubkey: &Pubkey,
) -> anyhow::Result<VersionedTransaction> {
    let account_keys = &message.account_keys;
    let existing_ixs: anyhow::Result<Vec<_>> = message
        .instructions
        .iter()
        .map(|compiled_ix| {
            let program_id = *account_keys
                .get(usize::from(compiled_ix.program_id_index))
                .ok_or_else(|| anyhow::anyhow!("Invalid program id index"))?;
            let accounts: anyhow::Result<Vec<_>> = compiled_ix
                .accounts
                .iter()
                .map(|&idx| {
                    let idx = usize::from(idx);
                    Ok(AccountMeta {
                        pubkey: *account_keys
                            .get(idx)
                            .ok_or_else(|| anyhow::anyhow!("Invalid account index"))?,
                        is_signer: message.is_signer(idx),
                        is_writable: message.is_maybe_writable(idx, None),
                    })
                })
                .collect();
            Ok(Instruction {
                program_id,
                accounts: accounts?,
                data: compiled_ix.data.clone(),
            })
        })
        .collect();

    let all_ixs: Vec<_> = create_ata_ixs.into_iter().chain(existing_ixs?).collect();

    let new_message = Message::new(&all_ixs, Some(transaction_sponsor_pubkey));
    Ok(VersionedTransaction::from(Transaction::new_unsigned(
        new_message,
    )))
}
