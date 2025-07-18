use std::sync::Arc;
use crate::config::Config;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{ErrorResponse};
use axum::Json;
use axum::{
    http::{HeaderName, Method},
    Router,
};
use base64::Engine;
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::RpcSendTransactionConfig;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use utoipa_axum::{router::OpenApiRouter, routes};

pub struct ServerState {
    pub url : String,
    pub keypair: Keypair,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct SponsorAndSendPayload {
    pub transaction: String,
}

#[utoipa::path(
    post,
    path = "/sponsor_and_send",
    request_body = SponsorAndSendPayload,
)]
async fn sponsor_and_send_handler(State(state): State<Arc<ServerState>>, Json(payload): Json<SponsorAndSendPayload>) -> Result<String, ErrorResponse> {
    let rpc = RpcClient::new(state.url.clone());
    let engine = base64::engine::general_purpose::STANDARD;
    
    let transaction_bytes = engine.decode(&payload.transaction)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    let mut transaction: VersionedTransaction = bincode::deserialize(&transaction_bytes).map_err(|e| (StatusCode::BAD_REQUEST, "Failed to deserialize transaction"))?;
    transaction.signatures[0] = state.keypair.sign_message(&transaction.message.serialize());
    let signature = rpc.send_transaction_with_config(&transaction, RpcSendTransactionConfig {skip_preflight: true, ..RpcSendTransactionConfig::default()}).map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to sponsor and send: {}", err)))?;
    Ok(signature.to_string())
}

pub async fn run_server(config: Config) -> () {
    let (router, _) = OpenApiRouter::new()
        .routes(routes!(sponsor_and_send_handler))
        .split_for_parts();

    let app = Router::new().nest("/api", router).layer(
        CorsLayer::new()
            .allow_origin(AllowOrigin::any())
            .allow_methods(AllowMethods::exact(Method::POST))
            .allow_headers(AllowHeaders::list(vec![HeaderName::from_static(
                "content-type",
            )])),
    )        .with_state(Arc::new(ServerState {
        url: config.url,
        keypair: config.keypair,
    }));;
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.port)).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
