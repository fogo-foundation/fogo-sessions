use crate::config::Config;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::ErrorResponse;
use axum::Json;
use axum::{
    http::{HeaderName, Method},
    Router,
};
use base64::Engine;
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::RpcSendTransactionConfig;
use solana_keypair::Keypair;
use solana_packet::PACKET_DATA_SIZE;
use solana_pubkey::Pubkey;
use solana_signer::{EncodableKey, Signer};
use solana_transaction::versioned::VersionedTransaction;
use std::sync::Arc;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use utoipa_axum::{router::OpenApiRouter, routes};

pub struct ServerState {
    pub keypair: Keypair,
    pub rpc: RpcClient,
    pub program_whitelist: Vec<Pubkey>,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct SponsorAndSendPayload {
    pub transaction: String,
}

pub fn validate_transaction(
    transaction: &VersionedTransaction,
    program_whitelist: &[Pubkey],
    sponsor: &Pubkey,
) -> Result<(), (StatusCode, String)> {
    if transaction.message.static_account_keys()[0] != *sponsor {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Transaction fee payer must be the sponsor: {}",
                transaction.message.static_account_keys()[0]
            ),
        ));
    }

    transaction
        .message
        .instructions()
        .iter()
        .try_for_each(|instruction| {
            let program_id = instruction.program_id(transaction.message.static_account_keys());
            if !program_whitelist.contains(program_id) {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!("Transaction contains unauthorized program ID: {program_id}"),
                ));
            }
            Ok(())
        })?;
    Ok(())
}

#[utoipa::path(
    post,
    path = "/sponsor_and_send",
    request_body = SponsorAndSendPayload,
)]
async fn sponsor_and_send_handler(
    State(state): State<Arc<ServerState>>,
    Json(payload): Json<SponsorAndSendPayload>,
) -> Result<String, ErrorResponse> {
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
    validate_transaction(
        &transaction,
        &state.program_whitelist,
        &state.keypair.pubkey(),
    )?;

    transaction.signatures[0] = state.keypair.sign_message(&transaction.message.serialize());

    let signature = state
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
                format!("Failed to sponsor and send: {err}"),
            )
        })?;
    Ok(signature.to_string())
}

#[utoipa::path(get, path = "/sponsor_pubkey")]
async fn sponsor_pubkey_handler(
    State(state): State<Arc<ServerState>>,
) -> Result<String, ErrorResponse> {
    Ok(state.keypair.pubkey().to_string())
}

pub async fn run_server(config: Config) -> () {
    let keypair = Keypair::read_from_file(&config.keypair_path).unwrap();

    let (router, _) = OpenApiRouter::new()
        .routes(routes!(sponsor_and_send_handler, sponsor_pubkey_handler))
        .split_for_parts();

    let app = Router::new()
        .nest("/api", router)
        .layer(
            CorsLayer::new()
                .allow_origin(AllowOrigin::any())
                .allow_methods(AllowMethods::exact(Method::POST))
                .allow_headers(AllowHeaders::list(vec![HeaderName::from_static(
                    "content-type",
                )])),
        )
        .with_state(Arc::new(ServerState {
            keypair,
            rpc: RpcClient::new(config.solana_url),
            program_whitelist: config.program_whitelist,
        }));
    let listener = tokio::net::TcpListener::bind(config.listen_address)
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
