use crate::config::{Config, Domain};
use crate::constraint::{ContextualDomainKeys, TransactionVariation};
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
use base64::Engine;
use dashmap::DashMap;
use solana_address_lookup_table_interface::state::AddressLookupTable;
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::{
    RpcSendTransactionConfig, RpcSimulateTransactionAccountsConfig, RpcSimulateTransactionConfig,
};
use solana_commitment_config::{CommitmentConfig, CommitmentLevel};
use solana_derivation_path::DerivationPath;
use solana_keypair::Keypair;
use solana_packet::PACKET_DATA_SIZE;
use solana_pubkey::Pubkey;
use solana_seed_derivable::SeedDerivable;
use solana_signature::Signature;
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
    pub max_sponsor_spending: u64,
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
    /// If so, returns Ok(()). Otherwise, returns an error with a message indicating why the transaction is invalid.
    pub async fn validate_transaction(
        &self,
        transaction: &VersionedTransaction,
        chain_index: &ChainIndex,
        max_sponsor_spending: u64,
    ) -> Result<(), (StatusCode, String)> {
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

        let matches_variation = self.tx_variations.iter().any(|variation| {
            self.validate_transaction_against_variation(transaction, variation, chain_index)
                .is_ok()
        });
        if !matches_variation {
            return Err((
                StatusCode::BAD_REQUEST,
                "Transaction does not match any allowed variations".to_string(),
            ));
        }

        // Simulate the transaction to check sponsor SOL spending
        let simulation_result = chain_index
            .rpc
            .simulate_transaction_with_config(
                transaction,
                RpcSimulateTransactionConfig {
                    sig_verify: false,
                    replace_recent_blockhash: true,
                    commitment: Some(CommitmentConfig {
                        commitment: CommitmentLevel::Processed,
                    }),
                    accounts: Some(RpcSimulateTransactionAccountsConfig {
                        encoding: None,
                        addresses: vec![self.sponsor.pubkey().to_string()],
                    }),
                    ..RpcSimulateTransactionConfig::default()
                },
            )
            .map_err(|err| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to simulate transaction: {err}"),
                )
            })?;

        if let Some(_err) = simulation_result.value.err {
            // The paymaster succeeds when the transaction simulation successfully determines that the
            // transaction returns an error. This is a stopgap measure to unblock 3rd parties while we figure
            // out the underlying problems with transaction simulation.
            return Ok(());
        }

        // Check if the sponsor account balance change exceeds the maximum permissible value
        if let Some(accounts) = simulation_result.value.accounts {
            if let Some(Some(account)) = accounts.first() {
                let current_balance = account.lamports;
                // We need to get the pre-transaction balance to calculate the change
                let pre_balance = chain_index
                    .rpc
                    .get_balance(&self.sponsor.pubkey())
                    .map_err(|err| {
                        (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            format!("Failed to get sponsor balance: {err}"),
                        )
                    })?;

                let balance_change = pre_balance.saturating_sub(current_balance);

                if balance_change > max_sponsor_spending {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        format!("Sponsor spending exceeds limit: {balance_change} lamports (max: {max_sponsor_spending})"),
                    ));
                }
            }
        }

        Ok(())
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
    /// Whether to confirm the transaction
    confirm: bool,
    #[serde(default)]
    /// Domain to request the sponsor pubkey for
    domain: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(untagged)]
pub enum SponsorAndSendResponse {
    Send(Signature),
    Confirm(ConfirmationResult),
}

impl IntoResponse for SponsorAndSendResponse {
    fn into_response(self) -> Response {
        match self {
            SponsorAndSendResponse::Send(signature) => signature.to_string().into_response(),
            SponsorAndSendResponse::Confirm(result) => Json(result).into_response(),
        }
    }
}

fn get_domain_state(
    state: &ServerState,
    domain_query_parameter: Option<String>,
    origin: Option<TypedHeader<Origin>>,
) -> Result<&DomainState, (StatusCode, String)> {
    let domain = domain_query_parameter
        .or_else(|| origin.map(|origin| origin.to_string()))
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "The http origin header or query parameter domain is required".to_string(),
            )
        })?;

    let domain_state = state
        .domains
        .get(&domain)
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                format!(
                    "The domain {domain} is not registered with the paymaster, please either set the domain property in FogoSessionProvider to match your production domain or reach out to the Fogo team to get a paymaster configuration for your app"
                ),
            )
        })?;

    Ok(domain_state)
}

#[utoipa::path(
    post,
    path = "/sponsor_and_send",
    request_body = SponsorAndSendPayload,
    params(SponsorAndSendQuery)
)]
async fn sponsor_and_send_handler(
    State(state): State<Arc<ServerState>>,
    origin: Option<TypedHeader<Origin>>,
    Query(SponsorAndSendQuery { confirm, domain }): Query<SponsorAndSendQuery>,
    Json(payload): Json<SponsorAndSendPayload>,
) -> Result<SponsorAndSendResponse, ErrorResponse> {
    let domain_state = get_domain_state(&state, domain, origin)?;

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

    domain_state
        .validate_transaction(&transaction, &state.chain_index, state.max_sponsor_spending)
        .await?;

    transaction.signatures[0] = domain_state
        .sponsor
        .sign_message(&transaction.message.serialize());

    if confirm {
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
        Ok(SponsorAndSendResponse::Confirm(confirmation_result))
    } else {
        let signature = state
            .chain_index
            .rpc
            .send_transaction_with_config(
                &transaction,
                RpcSendTransactionConfig {
                    skip_preflight: true,
                    ..RpcSendTransactionConfig::default()
                },
            )
            .map_err(|err| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to broadcast transaction: {err}"),
                )
            })?;
        Ok(SponsorAndSendResponse::Send(signature))
    }
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
    let DomainState {
        domain_registry_key: _,
        sponsor,
        enable_preflight_simulation: _,
        tx_variations: _,
    } = get_domain_state(&state, domain, origin)?;
    Ok(sponsor.pubkey().to_string())
}

pub async fn run_server(
    Config {
        mnemonic_file,
        solana_url,
        max_sponsor_spending,
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

    let app = Router::new()
        .nest("/api", router)
        .layer(
            CorsLayer::new()
                .allow_origin(AllowOrigin::any())
                .allow_methods(AllowMethods::list([Method::POST, Method::GET]))
                .allow_headers(AllowHeaders::list(vec![HeaderName::from_static(
                    "content-type",
                )])),
        )
        .with_state(Arc::new(ServerState {
            max_sponsor_spending,
            domains,
            chain_index: ChainIndex {
                rpc,
                lookup_table_cache: DashMap::new(),
            },
        }));
    let listener = tokio::net::TcpListener::bind(listen_address).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
