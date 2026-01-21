use anyhow::Context;
use rand::distr::{Bernoulli, Distribution};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_with::{serde_as, DisplayFromStr};
use solana_client::{nonblocking::rpc_client::RpcClient, rpc_config::RpcSendTransactionConfig};
use solana_commitment_config::CommitmentLevel;
use solana_keypair::Keypair;
use solana_pubkey::Pubkey;
use futures::future::join_all;
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use std::str::FromStr;
use url::{Url, form_urlencoded};

use crate::{api::ValiantClient, cli::NetworkEnvironment, constraint::MintSwapRate, parse::parse_transaction_from_base64, rpc::{ConfirmationResultInternal, SignedVersionedTransaction, get_spl_ata_balance, send_and_confirm_transaction_ftl}, serde::{deserialize_pubkey_vec, serialize_pubkey_vec}};

pub const VALIANT_URL_MAINNET: &str = "https://mainnet-pro-api.valiant.trade";
pub const VALIANT_URL_TESTNET: &str = "https://api.valiant.trade";
pub const MAX_SLIPPAGE_BPS: u64 = 50;

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
#[allow(dead_code)]
struct TwoHopQuoteResponse {
    #[serde_as(as = "DisplayFromStr")]
    token_in: u64,
    #[serde_as(as = "DisplayFromStr")]
    token_est_out: u64,
    #[serde_as(as = "DisplayFromStr")]
    price_impact: f64,
    quote: TwoHopQuote,
    token_metadatas: Vec<TokenMetadata>,
}

#[serde_as]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct TwoHopQuote {
    #[serde(deserialize_with = "deserialize_pubkey_vec")]
    route: Vec<Pubkey>,
    #[serde(deserialize_with = "deserialize_pubkey_vec")]
    pools: Vec<Pubkey>,
    #[serde_as(as = "Vec<DisplayFromStr>")]
    amounts: Vec<u64>,
    #[serde_as(as = "Vec<DisplayFromStr>")]
    virtual_amounts_without_slippage: Vec<u64>,
    #[serde_as(as = "Vec<DisplayFromStr>")]
    fees: Vec<u64>,
}

#[serde_as]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct TokenMetadata {
    #[serde_as(as = "DisplayFromStr")]
    address: Pubkey,
    name: String,
    symbol: String,
    decimals: u8,
    image: String,
    price_usd: f64,
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
            reqwest::header::HeaderValue::from_str(&api_key).expect("Invalid API key"),
        );
        let client = Client::builder()
            .default_headers(headers)
            .build()
            .expect("Failed to build Valiant client");
        let base_url = if let Some(override_url) = valiant_url_override {
            Url::from_str(&override_url)
        } else {
            match network_environment {
                NetworkEnvironment::Mainnet => Url::from_str(VALIANT_URL_MAINNET),
                NetworkEnvironment::Testnet => Url::from_str(VALIANT_URL_TESTNET),
                NetworkEnvironment::Localnet => return Err(anyhow::anyhow!("Localnet Valiant is not supported")),
            }
        }?;
        Ok(
            ValiantClient {
                client,
                base_url,
            }
        )
    }

    /// Swaps tokens into FOGO based on sampling using the provided mint swap rates.
    /// If the sample is successful, constructs and submits a swap transaction.
    pub async fn swap_tokens_probabilistic(
        &self,
        mint_swap_rates: &[MintSwapRate],
        transaction_sponsor: &Keypair,
        rpc: &RpcClient,
    ) -> Vec<anyhow::Result<ConfirmationResultInternal>> {
        let futures = mint_swap_rates.iter().filter_map(|mint_swap_rate| {
            if mint_swap_rate.sample() {
                Some(self.swap_token(mint_swap_rate.mint, transaction_sponsor, rpc))
            } else {
                None
            }
        });
        let swap_results = join_all(futures).await;
        swap_results
    }

    async fn swap_token(
        &self,
        mint: Pubkey,
        transaction_sponsor: &Keypair,
        rpc: &RpcClient,
    ) -> anyhow::Result<ConfirmationResultInternal> {
        let paymaster_wallet_key = transaction_sponsor.pubkey();
        let swap_transaction = self.get_valiant_swap_transaction(
            mint,
            get_spl_ata_balance(&paymaster_wallet_key, &mint, &rpc).await?,
            &paymaster_wallet_key,
        ).await?;

        let signature = transaction_sponsor.sign_message(&swap_transaction.message.serialize());
        let signed_transaction = SignedVersionedTransaction::new(swap_transaction, signature)
            .map_err(|e| anyhow::anyhow!("Failed to sign swap transaction: {}", e))?;

        let rpc_config = RpcSendTransactionConfig {
            skip_preflight: true,
            preflight_commitment: Some(CommitmentLevel::Processed),
            ..RpcSendTransactionConfig::default()
        };
        let confirmation_result = send_and_confirm_transaction_ftl(rpc, &signed_transaction, rpc_config).await.map_err(|e| anyhow::anyhow!("Failed to send swap transaction: {:?}", e))?;
        Ok(confirmation_result)
    }

    async fn get_valiant_swap_transaction(
        &self,
        mint_in: Pubkey,
        amount_in: u64,
        pubkey: &Pubkey,
    ) -> anyhow::Result<VersionedTransaction> {
        let quote_response = self.get_two_hop_quote(mint_in, amount_in).await?;
        let amount_out_min = quote_response.token_est_out.checked_mul(10_000 - MAX_SLIPPAGE_BPS).context("Overflow on minimum output amount calculation")? / 10_000;

        let swap_response = self.get_two_hop_swap(pubkey, amount_in, amount_out_min, quote_response.quote.route, quote_response.quote.pools).await?;

        parse_transaction_from_base64(&swap_response.serialized_tx)
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

        let response: TwoHopQuoteResponse = self.client
            .get(self.base_url.join("/dex/twoHopQuote")?)
            .query(&params)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        
        Ok(response)
    }

    /// Queries the /dex/txs/twoHopSwap endpoint to retrieve a constructed swap transaction.
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
            include_fee: false,
        };

        let query_string = build_swap_query_string(&params);

        let mut url = self.base_url.join("/dex/txs/twoHopSwap")?;
        url.set_query(Some(&query_string));

        let response: TwoHopSwapResponse = self.client.get(url)
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
        let p = self.rate.min(1.0).max(0.0);
        let rv = Bernoulli::new(p);
        // this should always be okay, since 0 <= p <= 1
        if let Ok(bern) = rv {
            return bern.sample(&mut rand::rng());
        }
        false
    }
}
