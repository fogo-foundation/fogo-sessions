use crate::config_manager::config::Domain;
use crate::constraint::transaction::TransactionToValidate;
use crate::constraint::{ContextualDomainKeys, ParsedTransactionVariation};
use crate::metrics::{obs_actual_transaction_costs, obs_send, obs_validation};
use crate::pooled_http_sender::PooledHttpSender;
use crate::rpc::{
    fetch_transaction_cost_details, send_and_confirm_transaction, send_and_confirm_transaction_ftl,
    ChainIndex, ConfirmationResultInternal, RetryConfig, SignedVersionedTransaction,
};
use arc_swap::ArcSwap;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::ErrorResponse;
use axum::Json;
use axum::{
    http::{HeaderName, Method},
    Router,
};
use axum_extra::headers::Origin;
use axum_extra::TypedHeader;
use axum_prometheus::metrics_exporter_prometheus::{Matcher, PrometheusBuilder};
use axum_prometheus::PrometheusMetricLayer;
use base64::Engine;
use dashmap::DashMap;
use fogo_sessions_sdk::domain_registry::get_domain_record_address;
use nonempty::NonEmpty;
use serde_with::{serde_as, DisplayFromStr};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_client::rpc_config::RpcSendTransactionConfig;
use solana_commitment_config::{CommitmentConfig, CommitmentLevel};
use solana_derivation_path::DerivationPath;
use solana_keypair::Keypair;
use solana_packet::PACKET_DATA_SIZE;
use solana_pubkey::Pubkey;
use solana_pubsub_client::nonblocking::pubsub_client::PubsubClient;
use solana_rpc_client::rpc_client::RpcClientConfig;
use solana_seed_derivable::SeedDerivable;
use solana_signature::Signature;
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_error::TransactionError;
use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use tracing::Instrument;
use utoipa_axum::{router::OpenApiRouter, routes};

pub struct DomainState {
    pub domain_registry_key: Pubkey,
    pub sponsors: NonEmpty<Keypair>,
    pub next_autoassigned_sponsor_index: Arc<AtomicUsize>,
    pub enable_preflight_simulation: bool,
    pub tx_variations: HashMap<String, ParsedTransactionVariation>,
}

pub struct PubsubClientWithReconnect {
    pub client: ArcSwap<PubsubClient>,
    pub rpc_url_ws: String,
    /// Mutex to prevent redundant concurrent reconnections
    pub reconnect_lock: Mutex<()>,
}

impl PubsubClientWithReconnect {
    pub fn new(rpc_url_ws: String, client: PubsubClient) -> Self {
        Self {
            client: ArcSwap::from_pointee(client),
            rpc_url_ws,
            reconnect_lock: Mutex::new(()),
        }
    }

    /// Reconnects the PubsubClient after grabbing a lock which prevents concurrent reconnections.
    pub async fn reconnect_pubsub(&self) -> Result<(), (StatusCode, String)> {
        let old_client = self.client.load_full();

        let _lock = self.reconnect_lock.lock().await;

        let current_client = self.client.load_full();

        // checks if the client was changed while waiting for the lock
        // if so, then no need to reconnect
        if Arc::ptr_eq(&old_client, &current_client) {
            match PubsubClient::new(&self.rpc_url_ws).await {
                Ok(new_client) => {
                    let new_arc = Arc::new(new_client);
                    self.client.store(new_arc);
                    tracing::debug!("Reconnected to WebSocket RPC at {}", self.rpc_url_ws);
                    Ok(())
                }
                Err(e) => Err((
                    StatusCode::SERVICE_UNAVAILABLE,
                    format!("WebSocket unavailable: {e}"),
                )),
            }
        } else {
            Ok(())
        }
    }
}

pub struct ServerState {
    pub domains: Arc<ArcSwap<HashMap<String, DomainState>>>,
    pub chain_index: ChainIndex,
    pub rpc_sub: PubsubClientWithReconnect,
    pub ftl_rpc: Option<RpcClient>,
    pub fee_coefficients: HashMap<Pubkey, u64>,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct SponsorAndSendPayload {
    pub transaction: String,
}

impl DomainState {
    /// Checks that the transaction meets at least one of the specified variations for this domain.
    /// If so, returns the variation this transaction matched against.
    /// Otherwise, returns an error with a message indicating why the transaction is invalid.
    #[tracing::instrument(skip_all, fields(specified_variation = variation_name.as_deref(), matched_variation))]
    pub async fn validate_transaction(
        &self,
        transaction: &TransactionToValidate<'_>,
        chain_index: &ChainIndex,
        sponsor: &Pubkey,
        variation_name: Option<String>,
    ) -> Result<&ParsedTransactionVariation, (StatusCode, String)> {
        let message_bytes = transaction.message.serialize();
        transaction
            .signatures
            .iter()
            .zip(transaction.message.static_account_keys())
            .skip(1)
            .try_for_each(|(signature, pubkey)| {
                signature
                    .verify(pubkey.as_ref(), &message_bytes)
                    .then_some(())
                    .ok_or_else(|| {
                        (
                            StatusCode::BAD_REQUEST,
                            format!("Missing or invalid signature for account {pubkey}")
                                .to_string(),
                        )
                    })
            })?;

        let validation_futures: Vec<_> = self
            .tx_variations
            .iter()
            .filter_map(|(name, variation)| {
                if let Some(ref expected_name) = variation_name {
                    if name != expected_name {
                        return None;
                    }
                }

                Some(Box::pin(async move {
                    self.validate_transaction_against_variation(
                        transaction,
                        variation,
                        chain_index,
                        sponsor,
                    )
                    .await
                    .map(|_| variation)
                }))
            })
            .collect();

        // If no variations were validated and the variation_name was specified, return an error indicating no such variation.
        // If no variation_name was specified, return an error indicating no variations are configured for this domain.
        if validation_futures.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                if let Some(name) = variation_name {
                    format!("No transaction variation named '{name}' for domain")
                } else {
                    "No transaction variations configured for domain".to_string()
                },
            ));
        } else if variation_name.is_some() {
            // If variation_name was specified, only one future will be present, and we can propagate its specific error.
            let future = validation_futures
                .into_iter()
                .next()
                .expect("validation_futures is not empty, so this must exist");
            let variation = future.await?;
            tracing::Span::current().record("matched_variation", variation.name().to_string());
            Ok(variation)
        } else {
            match futures::future::select_ok(validation_futures).await {
                Ok((variation, _remaining)) => {
                    tracing::Span::current()
                        .record("matched_variation", variation.name().to_string());
                    Ok(variation)
                }
                Err(_) => Err((
                    StatusCode::BAD_REQUEST,
                    "Transaction does not match any allowed variations".to_string(),
                )),
            }
        }
    }

    pub async fn validate_transaction_against_variation(
        &self,
        transaction: &TransactionToValidate<'_>,
        tx_variation: &ParsedTransactionVariation,
        chain_index: &ChainIndex,
        sponsor: &Pubkey,
    ) -> Result<(), (StatusCode, String)> {
        match tx_variation {
            ParsedTransactionVariation::V0(variation) => {
                variation.validate_transaction(transaction)
            }
            ParsedTransactionVariation::V1(variation) => {
                variation
                    .validate_transaction(
                        transaction,
                        &ContextualDomainKeys {
                            domain_registry: self.domain_registry_key,
                            sponsor: *sponsor,
                        },
                        chain_index,
                    )
                    .await
            }
        }
    }
}

#[derive(serde::Deserialize, utoipa::IntoParams)]
#[serde(deny_unknown_fields)]
#[into_params(parameter_in = Query)]
struct SponsorAndSendQuery {
    #[serde(default, rename = "confirm")]
    #[deprecated]
    /// Whether to confirm the transaction
    _confirm: bool,

    #[serde(default)]
    /// Domain to request the sponsor pubkey for
    domain: Option<String>,

    #[serde(default)]
    /// Variation name to validate against. If not provided, all variations for the domain will be tried.
    variation: Option<String>,
}

fn get_domain_name(
    domain_explicit: Option<String>,
    origin: Option<TypedHeader<Origin>>,
) -> Result<String, (StatusCode, String)> {
    let domain = domain_explicit
        .or_else(|| origin.map(|origin| origin.to_string()))
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "The http origin header or query parameter domain is required".to_string(),
            )
        })?;

    Ok(domain)
}

fn get_domain_state<'a>(
    domains: &'a HashMap<String, DomainState>,
    domain_query_parameter: &str,
) -> Result<&'a DomainState, (StatusCode, String)> {
    let domain_state = domains
        .get(domain_query_parameter)
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                format!(
                    "The domain {domain_query_parameter} is not registered with the paymaster, please either set the domain property in FogoSessionProvider to match your production domain or reach out to the Fogo team to get a paymaster configuration for your app"
                ),
            )
        })?;

    Ok(domain_state)
}

async fn readiness_handler() -> StatusCode {
    StatusCode::OK
}

#[serde_as]
#[derive(serde::Serialize)]
#[serde(tag = "type")]
pub enum ConfirmationResult {
    /// Transaction was confirmed and succeeded on chain
    #[serde(rename = "success")]
    Success {
        #[serde_as(as = "DisplayFromStr")]
        signature: Signature,
    },

    /// TODO: Disambiguate between confirmed and failed on chain vs failed preflight
    #[serde(rename = "failed")]
    Failed {
        #[serde_as(as = "DisplayFromStr")]
        signature: Signature,
        error: TransactionError,
    },
}

#[utoipa::path(
    post,
    path = "/sponsor_and_send",
    request_body = SponsorAndSendPayload,
    params(SponsorAndSendQuery)
)]
#[tracing::instrument(
    skip_all,
    name = "sponsor_and_send",
    fields(domain, specified_variation = variation.as_deref(), matched_variation, tx_hash)
)]
async fn sponsor_and_send_handler(
    State(state): State<Arc<ServerState>>,
    origin: Option<TypedHeader<Origin>>,
    Query(SponsorAndSendQuery {
        domain, variation, ..
    }): Query<SponsorAndSendQuery>,
    Json(payload): Json<SponsorAndSendPayload>,
) -> Result<Json<ConfirmationResult>, ErrorResponse> {
    let domain = get_domain_name(domain, origin)?;
    tracing::Span::current().record("domain", domain.as_str());
    let domains_guard = state.domains.load();
    let domain_state = get_domain_state(&domains_guard, &domain)?;

    let transaction_bytes = base64::engine::general_purpose::STANDARD
        .decode(&payload.transaction)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Failed to deserialize transaction"))?;

    if transaction_bytes.len() > PACKET_DATA_SIZE {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Transaction is too large: {} > {PACKET_DATA_SIZE}",
                transaction_bytes.len()
            ),
        ))?;
    }

    let (transaction, _): (VersionedTransaction, _) =
        bincode::serde::decode_from_slice(&transaction_bytes, bincode::config::standard())
            .map_err(|_| (StatusCode::BAD_REQUEST, "Failed to deserialize transaction"))?;

    let fee_payer = transaction
        .message
        .static_account_keys()
        .get(0)
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "The transaction must have a fee payer",
            )
        })?;
    let transaction_sponsor: &Keypair = domain_state
        .sponsors
        .iter()
        .find(|sponsor| sponsor.pubkey() == *fee_payer)
        .ok_or_else(|| -> (StatusCode, String) {
            let status_code = StatusCode::BAD_REQUEST;
            obs_validation(domain.clone(), None, status_code.to_string());
            (
                status_code,
                format!(
                    "Transaction fee payer must be one of the sponsors: expected one of {}, got {}",
                    domain_state
                        .sponsors
                        .iter()
                        .map(|sponsor| sponsor.pubkey().to_string())
                        .collect::<Vec<_>>()
                        .join(","),
                    fee_payer,
                ),
            )
        })?;

    let transaction_to_validate =
        TransactionToValidate::parse(&transaction, &state.chain_index, &state.fee_coefficients)
            .await?;
    let matched_variation_name = match domain_state
        .validate_transaction(
            &transaction_to_validate,
            &state.chain_index,
            &transaction_sponsor.pubkey(),
            variation,
        )
        .await
    {
        Ok(variation) => {
            tracing::Span::current().record("matched_variation", variation.name());
            obs_validation(
                domain.clone(),
                Some(variation.name().to_owned()),
                "success".to_string(),
            );
            variation.name()
        }
        Err(e) => {
            obs_validation(domain.clone(), None, "invalid".to_string());
            return Err(e.into());
        }
    }
    .to_owned();
    let gas_spend = transaction_to_validate.gas_spend;

    let signature = transaction_sponsor.sign_message(&transaction.message.serialize());
    let signed_transaction = SignedVersionedTransaction::new(transaction, signature)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    tracing::Span::current().record("tx_hash", signed_transaction.signature().to_string());

    let rpc_config = RpcSendTransactionConfig {
        skip_preflight: !domain_state.enable_preflight_simulation,
        preflight_commitment: Some(CommitmentLevel::Processed),
        ..RpcSendTransactionConfig::default()
    };

    let confirmation_result = if let Some(ref ftl_rpc) = state.ftl_rpc {
        // Use FTL service for sending and confirmation
        send_and_confirm_transaction_ftl(ftl_rpc, &signed_transaction, rpc_config).await?
    } else {
        // Use standard RPC method
        send_and_confirm_transaction(
            &state.chain_index.rpc,
            &state.rpc_sub,
            &signed_transaction,
            rpc_config,
        )
        .await?
    };

    let confirmation_status = confirmation_result.status_string();

    obs_send(
        domain.clone(),
        matched_variation_name.clone(),
        confirmation_status.clone(),
    );

    // Spawn async task to fetch actual transaction costs from RPC
    // This happens in the background to avoid blocking the response to the client
    // Only fetch if the transaction actually succeeded on chain
    let signature = match &confirmation_result {
        ConfirmationResultInternal::Success { signature } => Some(*signature),
        ConfirmationResultInternal::Failed { signature, .. } => Some(*signature),
        _ => None,
    };

    if let Some(signature_to_fetch) = signature {
        // We capture the current span to propagate to the spawned task.
        // This ensures that any logs/traces from the spawned task are associated with the original request.
        let span = tracing::Span::current();

        tokio::spawn(
            async move {
                match fetch_transaction_cost_details(
                    &state.chain_index.rpc,
                    &signature_to_fetch,
                    gas_spend,
                    RetryConfig {
                        max_tries: 3,
                        sleep_ms: 2000,
                    },
                )
                .await
                {
                    Ok(cost_details) => {
                        obs_actual_transaction_costs(
                            domain,
                            matched_variation_name,
                            confirmation_status,
                            cost_details,
                        );
                    }
                    Err(e) => {
                        tracing::warn!(
                            "Failed to fetch transaction cost details for {signature_to_fetch}: {e}",
                        );
                    }
                }
            }
            .instrument(span),
        );
    }

    Ok(Json(confirmation_result.into()))
}

#[derive(serde::Deserialize, utoipa::IntoParams)]
#[serde(deny_unknown_fields)]
#[into_params(parameter_in = Query)]
struct SponsorPubkeyQuery {
    #[serde(default)]
    /// Domain to request the sponsor pubkey for
    domain: Option<String>,
    #[serde(default)]
    #[param(value_type = String)]
    /// Index of the sponsor to select. Can be a number or the string "autoassign" which may give you a different sponsor every time
    index: Option<IndexSelector>,
}

#[derive(serde::Deserialize)]
#[serde(try_from = "String")]
enum IndexSelector {
    Autoassign,
    Index(u8),
}

impl TryFrom<String> for IndexSelector {
    type Error = String;
    fn try_from(value: String) -> Result<Self, Self::Error> {
        if value == "autoassign" {
            Ok(IndexSelector::Autoassign)
        } else {
            let i: u8 = value.parse().map_err(|_| {
                format!(
                    "Invalid index value: {value}. Use a number between 0 and 255 or 'autoassign'"
                )
            })?;
            Ok(IndexSelector::Index(i))
        }
    }
}

#[utoipa::path(get, path = "/sponsor_pubkey", params(SponsorPubkeyQuery))]
async fn sponsor_pubkey_handler(
    State(state): State<Arc<ServerState>>,
    origin: Option<TypedHeader<Origin>>,
    Query(SponsorPubkeyQuery { domain, index }): Query<SponsorPubkeyQuery>,
) -> Result<String, ErrorResponse> {
    let domain = get_domain_name(domain, origin)?;
    let domains_guard = state.domains.load();
    let domain_state = get_domain_state(&domains_guard, &domain)?;
    let DomainState {
        domain_registry_key: _,
        sponsors,
        enable_preflight_simulation: _,
        tx_variations: _,
        next_autoassigned_sponsor_index,
    } = domain_state;

    let sponsor_index = if let Some(selector) = index {
        match selector {
            IndexSelector::Autoassign => {
                next_autoassigned_sponsor_index.fetch_add(1, Ordering::Relaxed) % sponsors.len()
            }
            IndexSelector::Index(i) => {
                let index = usize::from(i);
                if index >= sponsors.len() {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        format!(
                            "Sponsor index {index} is out of bounds for domain {domain} with {} sponsors",
                            sponsors.len()
                        ),
                    )
                        .into());
                }
                index
            }
        }
    } else {
        0usize
    };
    Ok(sponsors[sponsor_index].pubkey().to_string())
}
#[serde_as]
#[derive(serde::Deserialize, utoipa::IntoParams)]
#[serde(deny_unknown_fields)]
#[into_params(parameter_in = Query)]
struct FeeQuery {
    #[serde(default)]
    /// Domain to request the fee for
    domain: Option<String>,

    /// Variation name to request the fee for
    variation: String,

    #[serde_as(as = "DisplayFromStr")]
    #[param(value_type = String)]
    /// Token mint to pay the fee in
    mint: Pubkey,
}

#[utoipa::path(get, path = "/fee", params(FeeQuery))]
async fn fee_handler(
    State(state): State<Arc<ServerState>>,
    origin: Option<TypedHeader<Origin>>,
    Query(FeeQuery {
        domain,
        variation,
        mint,
    }): Query<FeeQuery>,
) -> Result<Json<u64>, ErrorResponse> {
    let domain = get_domain_name(domain, origin)?;
    let domains_guard = state.domains.load();
    let domain_state = get_domain_state(&domains_guard, &domain)?;
    let DomainState { tx_variations, .. } = domain_state;

    let variation = tx_variations.get(&variation).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            format!("Variation {variation} not found for domain {domain}"),
        )
    })?;

    let fee_coefficient = state.fee_coefficients.get(&mint).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            format!("Paying paymaster fees in mint {mint} are not supported"),
        )
    })?;

    let paymaster_fee_lamports = match variation {
        ParsedTransactionVariation::V0(_) => 0,
        ParsedTransactionVariation::V1(v1_variation) => {
            v1_variation.paymaster_fee_lamports.unwrap_or(0)
        }
    };

    Ok(Json(paymaster_fee_lamports.div_ceil(*fee_coefficient)))
}

pub fn get_domain_state_map(
    domains: Vec<Domain>,
    mnemonic: &str,
) -> anyhow::Result<HashMap<String, DomainState>> {
    domains
        .into_iter()
        .map(
            |Domain {
                 domain,
                 enable_preflight_simulation,
                 tx_variations,
                 number_of_signers,
                 enable_session_management,
             }| {
                let domain_registry_key = get_domain_record_address(&domain);
                let sponsors = NonEmpty::collect((0u8..number_of_signers.into()).map(|i| {
                    Keypair::from_seed_and_derivation_path(
                        &solana_seed_phrase::generate_seed_from_seed_phrase_and_passphrase(
                            mnemonic, &domain,
                        ),
                        Some(DerivationPath::new_bip44(Some(i.into()), Some(0))),
                    )
                    .expect("Failed to derive keypair from mnemonic_file")
                }))
                .expect("number_of_signers in NonZero so this should never be empty");

                Ok((
                    domain,
                    DomainState {
                        domain_registry_key,
                        sponsors,
                        enable_preflight_simulation,
                        tx_variations: Domain::into_parsed_transaction_variations(
                            tx_variations,
                            enable_session_management,
                        )?,
                        next_autoassigned_sponsor_index: Arc::new(AtomicUsize::new(0)),
                    },
                ))
            },
        )
        .collect::<Result<HashMap<_, _>, _>>()
}

/// How many RPC clients to create for both FTL and the regular RPC client for read operations
const RPC_POOL_SIZE: usize = 6;

pub async fn run_server(
    rpc_url_http: String,
    rpc_url_ws: String,
    ftl_url: Option<String>,
    listen_address: String,
    domains_states: Arc<ArcSwap<HashMap<String, DomainState>>>,
    fee_coefficients: HashMap<Pubkey, u64>,
) {
    let rpc_http_sender = PooledHttpSender::new(rpc_url_http, RPC_POOL_SIZE);

    let rpc = RpcClient::new_sender(
        rpc_http_sender,
        RpcClientConfig::with_commitment(CommitmentConfig::processed()),
    );

    let rpc_sub_client = PubsubClient::new(&rpc_url_ws)
        .await
        .expect("Failed to create pubsub client");
    let rpc_sub = PubsubClientWithReconnect::new(rpc_url_ws, rpc_sub_client);

    // Create FTL RPC client with HTTP/2 prior knowledge if FTL URL is provided
    let ftl_rpc = ftl_url.map(|url| {
        let http_sender = PooledHttpSender::new(url, RPC_POOL_SIZE);

        RpcClient::new_sender(
            http_sender,
            RpcClientConfig::with_commitment(CommitmentConfig::processed()),
        )
    });

    let (router, _) = OpenApiRouter::new()
        .routes(routes!(sponsor_and_send_handler, sponsor_pubkey_handler))
        .routes(routes!(fee_handler))
        .split_for_parts();

    let handle = PrometheusBuilder::new()
        .set_buckets_for_metric(
            Matcher::Full(crate::metrics::GAS_SPEND_HISTOGRAM.to_string()),
            crate::metrics::TRANSACTION_COST_BUCKETS,
        )
        .unwrap()
        .set_buckets_for_metric(
            Matcher::Full(crate::metrics::TRANSFER_SPEND_HISTOGRAM.to_string()),
            crate::metrics::TRANSACTION_COST_BUCKETS,
        )
        .unwrap()
        .set_buckets_for_metric(
            Matcher::Full(crate::metrics::TOTAL_SPEND_HISTOGRAM.to_string()),
            crate::metrics::TRANSACTION_COST_BUCKETS,
        )
        .unwrap()
        .install_recorder()
        .expect("install metrics recorder");

    let prometheus_layer = PrometheusMetricLayer::new();

    let app = Router::new()
        .route("/ready", axum::routing::get(readiness_handler))
        .route(
            "/metrics",
            axum::routing::get(move || async move { handle.render() }),
        )
        .nest("/api", router)
        .layer(
            CorsLayer::new()
                .allow_origin(AllowOrigin::any())
                .allow_methods(AllowMethods::list([Method::POST, Method::GET]))
                .allow_headers(AllowHeaders::list(vec![HeaderName::from_static(
                    "content-type",
                )])),
        )
        .layer(prometheus_layer)
        .with_state(Arc::new(ServerState {
            domains: domains_states,
            fee_coefficients,
            chain_index: ChainIndex {
                rpc,
                lookup_table_cache: DashMap::new(),
            },
            rpc_sub,
            ftl_rpc,
        }));
    let listener = tokio::net::TcpListener::bind(listen_address).await.unwrap();
    tracing::info!("Starting paymaster service...");
    axum::serve(listener, app).await.unwrap();
}
