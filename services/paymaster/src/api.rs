use crate::config::Config;
use anchor_lang::{AnchorDeserialize, Discriminator};
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::ErrorResponse;
use axum::Json;
use axum::{
    http::{HeaderName, Method},
    Router,
};
use base64::Engine;
use serde::Serialize;
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::{
    RpcSendTransactionConfig, RpcSimulateTransactionAccountsConfig, RpcSimulateTransactionConfig,
};
use solana_commitment_config::{CommitmentConfig, CommitmentLevel};
use solana_keypair::Keypair;
use solana_packet::PACKET_DATA_SIZE;
use solana_pubkey::Pubkey;
use solana_signer::{EncodableKey, Signer};
use solana_transaction::versioned::VersionedTransaction;
use std::sync::Arc;
use tollbooth::instruction::{Enter, Exit};
use tollbooth::ID as TOLLBOOTH_PROGRAM_ID;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use utoipa_axum::{router::OpenApiRouter, routes};

pub struct ServerState {
    pub keypair: Keypair,
    pub rpc: RpcClient,
    pub program_whitelist: Vec<Pubkey>,
    pub max_sponsor_spending: u64,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct SponsorAndSendPayload {
    pub transaction: String,
}

pub async fn validate_transaction(
    transaction: &VersionedTransaction,
    program_whitelist: &[Pubkey],
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

    let instructions = transaction.message.instructions();
    instructions.iter().try_for_each(|instruction| {
        let program_id = instruction.program_id(transaction.message.static_account_keys());
        if !program_whitelist.contains(program_id) {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Transaction contains unauthorized program ID: {program_id}"),
            ));
        }
        Ok(())
    })?;

    // If the transaction is using the tollbooth, we don't need to simulate it
    if instructions
        .first()
        .map(|i| i.program_id(transaction.message.static_account_keys()) == &TOLLBOOTH_PROGRAM_ID)
        .unwrap_or_default()
    {
        let first_instruction = instructions.first().expect(
            "We know the array has at least 1 instruction because instructions.first() is Some",
        );

        let program_id = first_instruction.program_id(transaction.message.static_account_keys());
        if program_id != &TOLLBOOTH_PROGRAM_ID {
            return Err((
                    StatusCode::BAD_REQUEST,
                    format!("Invalid program for first instruction, expected: {TOLLBOOTH_PROGRAM_ID}, got: {program_id}"),
                ));
        }

        if !first_instruction.data.starts_with(Enter::DISCRIMINATOR) {
            return Err((
                StatusCode::BAD_REQUEST,
                "Invalid first instruction data, expected tollbooth Enter instruction".to_string(),
            ));
        }

        if !first_instruction
            .accounts
            .first()
            .and_then(|index| {
                transaction
                    .message
                    .static_account_keys()
                    .get(usize::from(*index))
            })
            .map(|x| x == sponsor)
            .unwrap_or_default()
        {
            return Err((
                StatusCode::BAD_REQUEST,
                "Enter instruction's sponsor must be the same as the paymaster's sponsor"
                    .to_string(),
            ));
        };

        let last_instruction = instructions.last().expect(
            "We know the array has at least 1 instruction because instructions.first() is Some",
        );

        let program_id = last_instruction.program_id(transaction.message.static_account_keys());
        if program_id != &TOLLBOOTH_PROGRAM_ID {
            return Err((
                    StatusCode::BAD_REQUEST,
                    format!("Invalid program for last instruction, expected: {TOLLBOOTH_PROGRAM_ID}, got: {program_id}"),
                ));
        }

        if !last_instruction.data.starts_with(Exit::DISCRIMINATOR) {
            return Err((
                StatusCode::BAD_REQUEST,
                "Invalid last instruction, expected tollbooth Exit instruction".to_string(),
            ));
        }

        if let Some(exit) = last_instruction
            .data
            .get(1..)
            .and_then(|x| Exit::try_from_slice(x).ok())
        {
            if u64::from(exit.max_allowed_spending) != max_sponsor_spending {
                return Err((
                            StatusCode::BAD_REQUEST,
                            format!("Exit instruction's max allowed spending must be the same as the paymaster's max sponsor spending. Expected: {max_sponsor_spending}, got: {}", u64::from(exit.max_allowed_spending)),
                        ));
            }
        } else {
            return Err((
                StatusCode::BAD_REQUEST,
                "Invalid last instruction, failed to deserialize Exit instruction".to_string(),
            ));
        }

        if !last_instruction
            .accounts
            .first()
            .and_then(|index| {
                transaction
                    .message
                    .static_account_keys()
                    .get(usize::from(*index))
            })
            .map(|x| x == sponsor)
            .unwrap_or_default()
        {
            return Err((
                StatusCode::BAD_REQUEST,
                "Exit instruction's sponsor must be the same as the paymaster's sponsor"
                    .to_string(),
            ));
        };

        if let Some(extra_instructions) = instructions.get(1..instructions.len().saturating_sub(1))
        {
            for instruction in extra_instructions {
                if instruction.program_id(transaction.message.static_account_keys())
                    == &TOLLBOOTH_PROGRAM_ID
                {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        "Tollbooth instructions must be the first and last instruction only"
                            .to_string(),
                    ));
                }
            }
        }
    } else {
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
    }

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
        &state.rpc,
        state.max_sponsor_spending,
    )
    .await?;

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

#[derive(utoipa::ToSchema, Serialize)]
pub struct SponsorConfig {
    pub max_sponsor_spending: u64,
}

#[utoipa::path(get, path = "/config")]
async fn config_handler(
    State(state): State<Arc<ServerState>>,
) -> Result<Json<SponsorConfig>, ErrorResponse> {
    Ok(Json(SponsorConfig {
        max_sponsor_spending: state.max_sponsor_spending,
    }))
}

pub async fn run_server(config: Config) {
    let keypair = Keypair::read_from_file(&config.keypair_path).unwrap();

    let (router, _) = OpenApiRouter::new()
        .routes(routes!(sponsor_and_send_handler))
        .routes(routes!(sponsor_pubkey_handler))
        .routes(routes!(config_handler))
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
            keypair,
            rpc: RpcClient::new(config.solana_url),
            program_whitelist: config.program_whitelist,
            max_sponsor_spending: config.max_sponsor_spending,
        }));
    let listener = tokio::net::TcpListener::bind(config.listen_address)
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
