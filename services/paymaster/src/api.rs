use crate::config::{Config, Domain};
use crate::constraint::{ContextualDomainKeys, TransactionVariation};
use crate::metrics::{obs_gas_spend, obs_send, obs_validation};
use crate::rpc::{send_and_confirm_transaction, ConfirmationResult};
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{ErrorResponse, IntoResponse, Response};
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
use solana_address_lookup_table_interface::state::AddressLookupTable;
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::RpcSendTransactionConfig;
use solana_commitment_config::{CommitmentConfig, CommitmentLevel};
use solana_derivation_path::DerivationPath;
use solana_keypair::Keypair;
use solana_packet::PACKET_DATA_SIZE;
use solana_pubkey::Pubkey;
use solana_seed_derivable::SeedDerivable;
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use std::collections::HashMap;
use std::sync::Arc;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use utoipa_axum::{router::OpenApiRouter, routes};

pub struct DomainState {
    pub domain_registry_key: Pubkey,
    pub sponsor: Keypair,
    pub enable_preflight_simulation: bool,
    pub tx_variations: Vec<TransactionVariation>,
}

pub struct ChainIndex {
    pub rpc: RpcClient,
    pub lookup_table_cache: DashMap<Pubkey, Vec<Pubkey>>,
}

pub struct ServerState {
    pub domains: HashMap<String, DomainState>,
    pub chain_index: ChainIndex,
}

impl ChainIndex {
    /// Finds the lookup table and the index within that table that correspond to the given relative account position within the list of lookup invoked accounts.
    pub fn find_and_query_lookup_table(
        &self,
        lookup_accounts: Vec<(Pubkey, u8)>,
        account_position_lookups: usize,
    ) -> Result<Pubkey, (StatusCode, String)> {
        let (table_to_query, index_to_query) =
            lookup_accounts.get(account_position_lookups).ok_or_else(|| {
                (
                    StatusCode::BAD_REQUEST,
                    format!("Account position {account_position_lookups} out of bounds for lookup table invoked accounts"),
                )
            })?;
        self.query_lookup_table_with_retry(table_to_query, usize::from(*index_to_query))
    }

    /// Queries the lookup table for the pubkey at the given index.
    /// If the table is not cached or the index is out of bounds, it fetches and updates the table from the RPC before requerying.
    pub fn query_lookup_table_with_retry(
        &self,
        table: &Pubkey,
        index: usize,
    ) -> Result<Pubkey, (StatusCode, String)> {
        self.query_lookup_table(table, index).or_else(|_| {
            let addresses = self.update_lookup_table(table)?;
            // get the key from the returned addresses instead of re-querying and re-locking the map
            addresses.get(index).copied().ok_or_else(|| {
                (
                    StatusCode::BAD_REQUEST,
                    format!("Lookup table {table} does not contain index {index}"),
                )
            })
        })
    }

    /// Queries the lookup table for the pubkey at the given index.
    /// Returns an error if the table is not cached or the index is out of bounds.
    pub fn query_lookup_table(
        &self,
        table: &Pubkey,
        index: usize,
    ) -> Result<Pubkey, (StatusCode, String)> {
        self.lookup_table_cache
            .get(table)
            .and_then(|entry| entry.get(index).copied())
            .ok_or_else(|| {
                (
                    StatusCode::BAD_REQUEST,
                    format!("Lookup table {table} does not contain index {index}"),
                )
            })
    }

    // Updates the lookup table entry in the dashmap based on pulling from RPC. Returns the updated table data.
    pub fn update_lookup_table(&self, table: &Pubkey) -> Result<Vec<Pubkey>, (StatusCode, String)> {
        let table_data = self.rpc.get_account(table).map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to fetch lookup table account {table} from RPC: {err}"),
            )
        })?;
        let table_data_deserialized =
            AddressLookupTable::deserialize(&table_data.data).map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to deserialize lookup table account {table}: {e}"),
                )
            })?;

        self.lookup_table_cache
            .insert(*table, table_data_deserialized.addresses.to_vec());

        Ok(table_data_deserialized.addresses.to_vec())
    }
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct SponsorAndSendPayload {
    pub transaction: String,
}

impl DomainState {
    /// Checks that the transaction meets at least one of the specified variations for this domain.
    /// If so, returns the variation this transaction matched against.
    /// Otherwise, returns an error with a message indicating why the transaction is invalid.
    #[tracing::instrument(skip_all, fields(variation,))]
    pub async fn validate_transaction(
        &self,
        transaction: &VersionedTransaction,
        chain_index: &ChainIndex,
    ) -> Result<&TransactionVariation, (StatusCode, String)> {
        if transaction.message.static_account_keys()[0] != self.sponsor.pubkey() {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction fee payer must be the sponsor: expected {}, got {}",
                    self.sponsor.pubkey(),
                    transaction.message.static_account_keys()[0],
                ),
            ));
        }

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

        let matched = self.tx_variations.iter().find(|variation| {
            self.validate_transaction_against_variation(transaction, variation, chain_index)
                .is_ok()
        });
        if let Some(variation) = matched {
            tracing::Span::current().record("variation", variation.name().to_string());
            Ok(variation)
        } else {
            Err((
                StatusCode::BAD_REQUEST,
                "Transaction does not match any allowed variations".to_string(),
            ))
        }
    }

    pub fn validate_transaction_against_variation(
        &self,
        transaction: &VersionedTransaction,
        tx_variation: &TransactionVariation,
        chain_index: &ChainIndex,
    ) -> Result<(), (StatusCode, String)> {
        match tx_variation {
            TransactionVariation::V0(variation) => variation.validate_transaction(transaction),
            TransactionVariation::V1(variation) => variation.validate_transaction(
                transaction,
                &ContextualDomainKeys {
                    domain_registry: self.domain_registry_key,
                    sponsor: self.sponsor.pubkey(),
                },
                chain_index,
            ),
        }
    }
}

#[derive(serde::Deserialize, utoipa::IntoParams)]
#[serde(deny_unknown_fields)]
#[into_params(parameter_in = Query)]
struct SponsorAndSendQuery {
    #[serde(default)]
    /// Domain to request the sponsor pubkey for
    domain: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(untagged)]
pub enum SponsorAndSendResponse {
    Confirm(ConfirmationResult),
}

impl IntoResponse for SponsorAndSendResponse {
    fn into_response(self) -> Response {
        match self {
            SponsorAndSendResponse::Confirm(result) => Json(result).into_response(),
        }
    }
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
    state: &'a ServerState,
    domain_query_parameter: &str,
) -> Result<&'a DomainState, (StatusCode, String)> {
    let domain_state = state
        .domains
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
    Query(SponsorAndSendQuery { domain }): Query<SponsorAndSendQuery>,
    Json(payload): Json<SponsorAndSendPayload>,
) -> Result<SponsorAndSendResponse, ErrorResponse> {
    let domain = get_domain_name(domain, origin)?;
    tracing::Span::current().record("domain", domain.as_str());
    let domain_state = get_domain_state(&state, &domain)?;

    let transaction_bytes = base64::engine::general_purpose::STANDARD
        .decode(&payload.transaction)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Failed to deserialize transaction"))?;

    if transaction_bytes.len() > PACKET_DATA_SIZE {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Transaction is too large: {} > {}",
                transaction_bytes.len(),
                PACKET_DATA_SIZE
            ),
        ))?;
    }

    let mut transaction: VersionedTransaction = bincode::deserialize(&transaction_bytes)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Failed to deserialize transaction"))?;

    let matched_variation_name = match domain_state
        .validate_transaction(&transaction, &state.chain_index)
        .await
    {
        Ok(variation) => {
            tracing::Span::current().record("variation", variation.name());
            obs_validation(
                domain.clone(),
                variation.name().to_owned(),
                "success".to_string(),
            );
            variation.name()
        }
        Err(e) => {
            obs_validation(domain.clone(), "None".to_string(), e.0.to_string());
            return Err(e.into());
        }
    }
    .to_owned();

    transaction.signatures[0] = domain_state
        .sponsor
        .sign_message(&transaction.message.serialize());
    tracing::Span::current().record("tx_hash", transaction.signatures[0].to_string());


    let confirmation_result = send_and_confirm_transaction(
        &state.chain_index.rpc,
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
        Some(confirmation_status.clone()),
    );

    let gas = crate::constraint::compute_gas_spent(&transaction)?;
    obs_gas_spend(
        domain,
        matched_variation_name,
        Some(confirmation_status),
        gas,
    );

    Ok(SponsorAndSendResponse::Confirm(confirmation_result))
}

#[derive(serde::Deserialize, utoipa::IntoParams)]
#[serde(deny_unknown_fields)]
#[into_params(parameter_in = Query)]
struct SponsorPubkeyQuery {
    #[serde(default)]
    /// Domain to request the sponsor pubkey for
    domain: Option<String>,
}

#[utoipa::path(get, path = "/sponsor_pubkey", params(SponsorPubkeyQuery))]
async fn sponsor_pubkey_handler(
    State(state): State<Arc<ServerState>>,
    origin: Option<TypedHeader<Origin>>,
    Query(SponsorPubkeyQuery { domain }): Query<SponsorPubkeyQuery>,
) -> Result<String, ErrorResponse> {
    let domain = get_domain_name(domain, origin)?;
    let DomainState {
        domain_registry_key: _,
        sponsor,
        enable_preflight_simulation: _,
        tx_variations: _,
    } = get_domain_state(&state, &domain)?;
    Ok(sponsor.pubkey().to_string())
}

pub async fn run_server(
    Config {
        mnemonic_file,
        solana_url,
        domains,
        listen_address,
    }: Config,
) {
    let mnemonic = std::fs::read_to_string(mnemonic_file).expect("Failed to read mnemonic_file");

    let rpc = RpcClient::new_with_commitment(
        solana_url,
        CommitmentConfig {
            commitment: CommitmentLevel::Processed,
        },
    );

    let domains = domains
        .into_iter()
        .map(
            |Domain {
                 domain,
                 enable_session_management,
                 enable_preflight_simulation,
                 tx_variations,
             }| {
                let domain_registry_key = domain_registry::domain::Domain::new_checked(&domain)
                    .expect("Failed to derive domain registry key")
                    .get_domain_record_address();
                let sponsor = Keypair::from_seed_and_derivation_path(
                    &solana_seed_phrase::generate_seed_from_seed_phrase_and_passphrase(
                        &mnemonic, &domain,
                    ),
                    Some(DerivationPath::new_bip44(Some(0), Some(0))),
                )
                .expect("Failed to derive keypair from mnemonic_file");

                let tx_variations = if enable_session_management {
                    let mut variations = tx_variations;
                    variations.push(TransactionVariation::session_establishment_variation());
                    variations.push(TransactionVariation::session_revocation_variation());
                    variations
                } else {
                    tx_variations
                };
                (
                    domain,
                    DomainState {
                        domain_registry_key,
                        sponsor,
                        enable_preflight_simulation,
                        tx_variations,
                    },
                )
            },
        )
        .collect::<HashMap<_, _>>();

    let (router, _) = OpenApiRouter::new()
        .routes(routes!(sponsor_and_send_handler, sponsor_pubkey_handler))
        .split_for_parts();

    let handle = PrometheusBuilder::new()
        .set_buckets_for_metric(
            Matcher::Full(crate::metrics::GAS_SPEND_HISTOGRAM.to_string()),
            crate::metrics::GAS_SPEND_BUCKETS,
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
            domains,
            chain_index: ChainIndex {
                rpc,
                lookup_table_cache: DashMap::new(),
            },
        }));
    let listener = tokio::net::TcpListener::bind(listen_address).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
