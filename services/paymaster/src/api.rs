use crate::config_manager::config::Domain;
use crate::constraint::{ContextualDomainKeys, TransactionVariation};
use crate::metrics::{obs_actual_transaction_costs, obs_send, obs_validation};
use crate::rpc::{
    fetch_transaction_cost_details, send_and_confirm_transaction, ChainIndex,
    ConfirmationResultInternal, RetryConfig,
};
use arc_swap::ArcSwap;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::ErrorResponse;
use axum::Json;
use solana_derivation_path::DerivationPath;

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
use serde_with::{serde_as, DisplayFromStr};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_client::rpc_config::RpcSendTransactionConfig;
use solana_commitment_config::{CommitmentConfig, CommitmentLevel};
use solana_keypair::Keypair;
use solana_packet::PACKET_DATA_SIZE;
use solana_pubkey::Pubkey;
use solana_pubsub_client::nonblocking::pubsub_client::PubsubClient;
use solana_seed_derivable::SeedDerivable;
use solana_signature::Signature;
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use solana_transaction_error::TransactionError;
use std::collections::HashMap;
use std::ops::Deref;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use tracing::Instrument;
use utoipa_axum::{router::OpenApiRouter, routes};
use rand::Rng;

pub struct NonEmptyVec<T> {
    inner: Vec<T>,
}

impl<T> NonEmptyVec<T> {
    pub fn new(inner: Vec<T>) -> Option<NonEmptyVec<T>> {
        return inner.is_empty().then_some(Self { inner });
    }
}

impl<T> Deref for NonEmptyVec<T> {
    type Target = Vec<T>;

    fn deref(&self) -> &Vec<T> {
        &self.inner
    }
}

pub struct DomainState {
    pub domain_registry_key: Pubkey,
    pub sponsors: NonEmptyVec<Keypair>,
    pub enable_preflight_simulation: bool,
    pub tx_variations: Vec<TransactionVariation>,
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
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct SponsorAndSendPayload {
    pub transaction: String,
}

impl DomainState {
    /// Checks that the transaction meets at least one of the specified variations for this domain.
    /// If so, returns the variation this transaction matched against.
    /// Otherwise, returns an error with a message indicating why the transaction is invalid.
    #[tracing::instrument(skip_all, fields(variation))]
    pub async fn validate_transaction(
        &self,
        transaction: &VersionedTransaction,
        chain_index: &ChainIndex,
        sponsor: &Pubkey,
    ) -> Result<&TransactionVariation, (StatusCode, String)> {
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
            .map(|variation| {
                Box::pin(async move {
                    self.validate_transaction_against_variation(transaction, variation, chain_index, sponsor)
                        .await
                        .map(|_| variation)
                })
            })
            .collect();

        match futures::future::select_ok(validation_futures).await {
            Ok((variation, _remaining)) => {
                tracing::Span::current().record("variation", variation.name().to_string());
                Ok(variation)
            }
            Err(_) => Err((
                StatusCode::BAD_REQUEST,
                "Transaction does not match any allowed variations".to_string(),
            )),
        }
    }

    pub async fn validate_transaction_against_variation(
        &self,
        transaction: &VersionedTransaction,
        tx_variation: &TransactionVariation,
        chain_index: &ChainIndex,
        sponsor: &Pubkey,
    ) -> Result<(), (StatusCode, String)> {
        match tx_variation {
            TransactionVariation::V0(variation) => variation.validate_transaction(transaction),
            TransactionVariation::V1(variation) => {
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
    fields(domain, variation, tx_hash)
)]
async fn sponsor_and_send_handler(
    State(state): State<Arc<ServerState>>,
    origin: Option<TypedHeader<Origin>>,
    Query(SponsorAndSendQuery { domain, .. }): Query<SponsorAndSendQuery>,
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

    let (mut transaction, _): (VersionedTransaction, _) =
        bincode::serde::decode_from_slice(&transaction_bytes, bincode::config::standard())
            .map_err(|_| (StatusCode::BAD_REQUEST, "Failed to deserialize transaction"))?;

    let transaction_sponsor : &Keypair = domain_state.sponsors.iter().find(|sponsor| sponsor.pubkey() == transaction.message.static_account_keys()[0]).ok_or_else(|| -> (StatusCode, String) {
        let status_code = StatusCode::BAD_REQUEST;
        obs_validation(domain.clone(), None, status_code.to_string());
        (
            status_code,
            format!(
                "Transaction fee payer must be one of the sponsors: expected one of {}, got {}",
                domain_state.sponsors.iter().map(|sponsor| sponsor.pubkey().to_string()).collect::<Vec<_>>().join(","),
                transaction.message.static_account_keys()[0],
            ),
        )
    })?;


    let matched_variation_name = match domain_state
        .validate_transaction(&transaction, &state.chain_index, &transaction_sponsor.pubkey())
        .await
    {
        Ok(variation) => {
            tracing::Span::current().record("variation", variation.name());
            obs_validation(
                domain.clone(),
                Some(variation.name().to_owned()),
                "success".to_string(),
            );
            variation.name()
        }
        Err(e) => {
            obs_validation(domain.clone(), None, e.0.to_string());
            return Err(e.into());
        }
    }
    .to_owned();

    transaction.signatures[0] = transaction_sponsor
        .sign_message(&transaction.message.serialize());
    tracing::Span::current().record("tx_hash", transaction.signatures[0].to_string());

    let confirmation_result = send_and_confirm_transaction(
        &state.chain_index.rpc,
        &state.rpc_sub,
        &transaction,
        RpcSendTransactionConfig {
            skip_preflight: !domain_state.enable_preflight_simulation,
            preflight_commitment: Some(CommitmentLevel::Processed),
            ..RpcSendTransactionConfig::default()
        },
    )
    .await?;

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
                    &transaction,
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
    /// If set and the domain has multiple sponsors, this will return the sponsor at the given index, instead of a random one.
    precise: Option<u8>,
}

#[utoipa::path(get, path = "/sponsor_pubkey", params(SponsorPubkeyQuery))]
async fn sponsor_pubkey_handler(
    State(state): State<Arc<ServerState>>,
    origin: Option<TypedHeader<Origin>>,
    Query(SponsorPubkeyQuery { domain, precise }): Query<SponsorPubkeyQuery>,
) -> Result<String, ErrorResponse> {
    let domain = get_domain_name(domain, origin)?;
    let domains_guard = state.domains.load();
    let domain_state = get_domain_state(&domains_guard, &domain)?;
    let DomainState {
        domain_registry_key: _,
        sponsors,
        enable_preflight_simulation: _,
        tx_variations: _,
    } = domain_state;

    let sponsor_index = precise.map(|i| i as usize).map(|i| 
        if i >= sponsors.len() {
            Err::<usize, (StatusCode, String)>((
                StatusCode::BAD_REQUEST,
                format!("Sponsor index {i} is out of bounds for domain {domain} with {} sponsors", sponsors.len()),
            )
                .into())
        } else {
            Ok(i)
        }
    ).transpose()?.unwrap_or(rand::rng().random_range(0usize..sponsors.len()));
    
    Ok(sponsors[sponsor_index].pubkey().to_string())
}

pub fn get_domain_state_map(domains: Vec<Domain>, mnemonic: &str) -> HashMap<String, DomainState> {
    domains
        .into_iter()
        .map(
            |Domain {
                 domain,
                 enable_preflight_simulation,
                 tx_variations,
                 number_of_signers,
                 ..
             }| {
                let domain_registry_key = get_domain_record_address(&domain);
                let sponsors = NonEmptyVec::new((0u8..number_of_signers.into()).map(|i| Keypair::from_seed_and_derivation_path(
                    &solana_seed_phrase::generate_seed_from_seed_phrase_and_passphrase(
                        mnemonic, &domain,
                    ),
                    Some(DerivationPath::new_bip44(Some(i.into()), Some(0))),
                ).expect("Failed to derive keypair from mnemonic_file")).collect());

                (
                    domain,
                    DomainState {
                        domain_registry_key,
                        sponsors,
                        enable_preflight_simulation,
                        tx_variations,
                    },
                )
            },
        )
        .collect::<HashMap<_, _>>()
}
pub async fn run_server(
    rpc_url_http: String,
    rpc_url_ws: String,
    listen_address: String,
    domains_states: Arc<ArcSwap<HashMap<String, DomainState>>>,
) {
    let rpc = RpcClient::new_with_commitment(
        rpc_url_http,
        CommitmentConfig {
            commitment: CommitmentLevel::Processed,
        },
    );
    let rpc_sub_client = PubsubClient::new(&rpc_url_ws)
        .await
        .expect("Failed to create pubsub client");
    let rpc_sub = PubsubClientWithReconnect::new(rpc_url_ws, rpc_sub_client);

    let (router, _) = OpenApiRouter::new()
        .routes(routes!(sponsor_and_send_handler, sponsor_pubkey_handler))
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
            chain_index: ChainIndex {
                rpc,
                lookup_table_cache: DashMap::new(),
            },
            rpc_sub,
        }));
    let listener = tokio::net::TcpListener::bind(listen_address).await.unwrap();
    tracing::info!("Starting paymaster service...");
    axum::serve(listener, app).await.unwrap();
}
