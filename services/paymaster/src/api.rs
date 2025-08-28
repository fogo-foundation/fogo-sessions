use crate::config::Config;
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
    pub keypair: Keypair,
    pub program_whitelist: Vec<Pubkey>,
}
pub struct ServerState {
    pub rpc: RpcClient,
    pub global_program_whitelist: Vec<Pubkey>,
    pub max_sponsor_spending: u64,
    pub domains: HashMap<String, DomainState>,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct SponsorAndSendPayload {
    pub transaction: String,
}

pub async fn validate_transaction(
    transaction: &VersionedTransaction,
    global_program_whitelist: &[Pubkey],
    domain_program_whitelist: &[Pubkey],
    sponsor: &Pubkey,
    rpc: &RpcClient,
    max_sponsor_spending: u64,
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
                        format!("Missing or invalid signature for account {pubkey}").to_string(),
                    )
                })
        })?;

    transaction
        .message
        .instructions()
        .iter()
        .try_for_each(|instruction| {
            let program_id = instruction.program_id(transaction.message.static_account_keys());
            if !global_program_whitelist.contains(program_id)
                && !domain_program_whitelist.contains(program_id)
            {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!("Transaction contains unauthorized program ID: {program_id}"),
                ));
            }
            Ok(())
        })?;

    // Simulate the transaction to check sponsor SOL spending
    let simulation_result = rpc
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
                    addresses: vec![sponsor.to_string()],
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
            let pre_balance = rpc.get_balance(sponsor).map_err(|err| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to get sponsor balance: {err}"),
                )
            })?;

            let balance_change = pre_balance.saturating_sub(current_balance);

            if balance_change > max_sponsor_spending {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Sponsor spending exceeds limit: {balance_change} lamports (max: {max_sponsor_spending})"
                    ),
                ));
            }
        }
    }

    Ok(())
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct SponsorAndSendQuery {
    #[serde(default)]
    confirm: bool,
    #[serde(default)]
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

#[utoipa::path(
    post,
    path = "/sponsor_and_send",
    request_body = SponsorAndSendPayload,
    params(
        ("domain" = Option<String>, Query, description = "Domain to request the sponsor pubkey for"),
        ("confirm" = Option<bool>, Query, description = "Whether to confirm the transaction")
    )
)]
async fn sponsor_and_send_handler(
    State(state): State<Arc<ServerState>>,
    origin: Option<TypedHeader<Origin>>,
    Query(SponsorAndSendQuery { confirm, domain }): Query<SponsorAndSendQuery>,
    Json(payload): Json<SponsorAndSendPayload>,
) -> Result<SponsorAndSendResponse, ErrorResponse> {
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

    let domain = domain
        .or_else(|| origin.map(|origin| origin.to_string()))
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "The http origin header or query parameter domain is required".to_string(),
            )
        })?;

    let DomainState {
        keypair,
        program_whitelist,
    } = state
        .domains
        .get(&domain)
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                format!("The http origin header or query parameter domain is not registered with the paymaster: {domain}")
            )
        })?;

    validate_transaction(
        &transaction,
        &state.global_program_whitelist,
        program_whitelist,
        &keypair.pubkey(),
        &state.rpc,
        state.max_sponsor_spending,
    )
    .await?;

    transaction.signatures[0] = keypair.sign_message(&transaction.message.serialize());

    if confirm {
        let confirmation_result = send_and_confirm_transaction(
            &state.rpc,
            &transaction,
            RpcSendTransactionConfig {
                skip_preflight: true,
                ..RpcSendTransactionConfig::default()
            },
        )
        .await?;
        Ok(SponsorAndSendResponse::Confirm(confirmation_result))
    } else {
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
                    format!("Failed to broadcast transaction: {err}"),
                )
            })?;
        Ok(SponsorAndSendResponse::Send(signature))
    }
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct SponsorPubkeyQuery {
    #[serde(default)]
    domain: Option<String>,
}

#[utoipa::path(
    get,
    path = "/sponsor_pubkey",
    params(
        ("domain" = Option<String>, Query, description = "Domain to request the sponsor pubkey for")
    )
)]
async fn sponsor_pubkey_handler(
    State(state): State<Arc<ServerState>>,
    origin: Option<TypedHeader<Origin>>,
    Query(SponsorPubkeyQuery { domain }): Query<SponsorPubkeyQuery>,
) -> Result<String, ErrorResponse> {
    let domain = domain
        .or_else(|| origin.map(|origin| origin.to_string()))
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "The http origin header or query parameter domain is required".to_string(),
            )
        })?;

    let DomainState { keypair, program_whitelist: _ } = state
        .domains
        .get(&domain)
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                format!("The http origin header or query parameter domain is not registered with the paymaster: {domain}"),
            )
        })?;
    Ok(keypair.pubkey().to_string())
}

pub async fn run_server(
    Config {
        mnemonic_file,
        solana_url,
        global_program_whitelist,
        max_sponsor_spending,
        domains,
        listen_address,
    }: Config,
) {
    let mnemonic = std::fs::read_to_string(mnemonic_file).expect("Failed to read mnemonic_file");

    let domains = domains
        .into_iter()
        .map(|domain| {
            let keypair = Keypair::from_seed_and_derivation_path(
                &solana_seed_phrase::generate_seed_from_seed_phrase_and_passphrase(
                    &mnemonic,
                    &domain.domain,
                ),
                Some(DerivationPath::new_bip44(Some(0), Some(0))),
            )
            .expect("Failed to derive keypair from mnemonic_file");

            (
                domain.domain,
                DomainState {
                    keypair,
                    program_whitelist: domain.program_whitelist,
                },
            )
        })
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
            global_program_whitelist,
            max_sponsor_spending,
            domains,
            rpc: RpcClient::new_with_commitment(
                solana_url,
                CommitmentConfig {
                    commitment: CommitmentLevel::Processed,
                },
            ),
        }));
    let listener = tokio::net::TcpListener::bind(listen_address).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
