use crate::config::{Config, Domain};
use crate::constraint::{compare_primitive_data_types, AccountConstraint, ContextualPubkeyTrait, DataConstraint, PrimitiveDataType, PrimitiveDataValue, TransactionVariation};
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
    pub tx_variations: Vec<TransactionVariation>,
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
    tx_variations: &[TransactionVariation],
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
            {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!("Transaction contains unauthorized program ID: {program_id}"),
                ));
            }

            Ok(())
        })?;

    let matches_variation = tx_variations.iter().any(|variation| {
        validate_transaction_against_variation(transaction, variation, sponsor).is_ok()
    });
    if !matches_variation {
        return Err((
            StatusCode::BAD_REQUEST,
            "Transaction does not match any allowed variations".to_string(),
        ));
    }

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

pub fn validate_transaction_against_variation(
    transaction: &VersionedTransaction,
    tx_variation: &TransactionVariation,
    sponsor: &Pubkey,
) -> Result<(), (StatusCode, String)> {
    match tx_variation {
        TransactionVariation::V0(variation) => validate_transaction_against_variation_v0(transaction, variation),
        TransactionVariation::V1Sessionful(variation) => validate_transaction_against_variation_v1(transaction, variation, sponsor, true),
        TransactionVariation::V1Sessionless(variation) => validate_transaction_against_variation_v1(transaction, variation, sponsor, false),
    }
}

pub fn validate_transaction_against_variation_v0(
    transaction: &VersionedTransaction,
    variation: &crate::constraint::VariationProgramWhitelist,
) -> Result<(), (StatusCode, String)> {
    for instruction in transaction.message.instructions() {
        let program_id = instruction.program_id(transaction.message.static_account_keys());
        if !variation.whitelisted_programs.contains(program_id) {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction contains unauthorized program ID {} for variation {}",
                    program_id, variation.name
                ),
            ));
        }
    }
    Ok(())
}

// TODO: incorporate gas spend and rate limit checks
pub fn validate_transaction_against_variation_v1<T: ContextualPubkeyTrait>(
    transaction: &VersionedTransaction,
    variation: &crate::constraint::VariationOrderedInstructionConstraints<T>,
    sponsor: &Pubkey,
    sessionful: bool,
) -> Result<(), (StatusCode, String)> {
    let instructions = transaction.message.instructions();
    if instructions.len() != variation.instructions.len() {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Transaction instruction count {} does not match expected count {} for variation {}",
                instructions.len(),
                variation.instructions.len(),
                variation.name
            ),
        ));
    }

    let mut instr_iter = instructions.iter().peekable();
    let mut constraint_iter = variation.instructions.iter().peekable();

    while let Some(constraint) = constraint_iter.next() {
        if !constraint.required {
            while let Some(instr) = instr_iter.peek() {
                let program_id = instr.program_id(transaction.message.static_account_keys());
                if *program_id == constraint.program {
                    break;
                }
                instr_iter.next();
            }
            if instr_iter.peek().is_none() || instr_iter.peek().map(|instr| instr.program_id(transaction.message.static_account_keys())) != Some(&constraint.program) {
                continue;
            }
        }

        let instr = instr_iter.next().ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction missing instruction for constraint in variation {}",
                    variation.name
                ),
            )
        })?;

        let program_id = instr.program_id(transaction.message.static_account_keys());
        if *program_id != constraint.program {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction instruction program ID {} does not match expected ID {} for variation {}",
                    program_id,
                    constraint.program,
                    variation.name
                ),
            ));
        }

        for (i, account_constraint) in constraint.accounts.iter().enumerate() {
            // TODO: account for lookup tables
            let account_index = instr.accounts.get(account_constraint.index as usize).ok_or_else(|| {
                (
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Transaction instruction missing account at index {} for variation {}",
                        i, variation.name
                    ),
                )
            })?;
            let account = transaction.message.static_account_keys()[*account_index as usize];
            let session = if sessionful {
                let session_signer = transaction
                    .message
                    .static_account_keys()
                    .iter()
                    .take(transaction.signatures.len())
                    .last();
                session_signer.ok_or_else(|| {
                    (
                        StatusCode::BAD_REQUEST,
                        "Transaction missing session signer".to_string(),
                    )
                })?;
                session_signer.cloned()
            } else {
                None
            };
            check_account_constraint(account, account_constraint, session, sponsor)?;
        }

        for data_constraint in &constraint.data {
            check_data_constraint(&instr.data, data_constraint)?;
        }
    }

    Ok(())
}

pub fn check_account_constraint<T: ContextualPubkeyTrait>(
    account: Pubkey,
    constraint: &AccountConstraint<T>,
    session: Option<Pubkey>,
    sponsor: &Pubkey,
) -> Result<(), (StatusCode, String)> {
    for excluded in &constraint.exclude {
        if let Some(msg) = excluded.matches_account(&account, session.as_ref(), sponsor, false) {
            return Err((StatusCode::BAD_REQUEST, msg));
        }
    }

    for included in &constraint.include {
        if let Some(msg) = included.matches_account(&account, session.as_ref(), sponsor, true) {
            return Err((StatusCode::BAD_REQUEST, msg));
        }
    }

    Ok(())
}

pub fn check_data_constraint(
    data: &[u8],
    constraint: &DataConstraint,
) -> Result<(), (StatusCode, String)> {
    if constraint.end_byte as usize > data.len() || constraint.start_byte as usize >= data.len() || constraint.start_byte >= constraint.end_byte {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Data constraint byte range {}-{} is out of bounds for data length {}",
                constraint.start_byte,
                constraint.end_byte,
                data.len()
            ),
        ));
    }

    let data_to_analyze = &data[constraint.start_byte as usize..constraint.end_byte as usize];
    let data_to_analyze_deserialized = match constraint.data_type {
        PrimitiveDataType::Bool => {
            if data_to_analyze.len() != 1 {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Data constraint expects 1 byte for Bool, found {} bytes",
                        data_to_analyze.len()
                    ),
                ));
            }
            PrimitiveDataValue::Bool(data_to_analyze[0] != 0)
        }

        PrimitiveDataType::U8 => {
            if data_to_analyze.len() != 1 {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Data constraint expects 1 byte for U8, found {} bytes",
                        data_to_analyze.len()
                    ),
                ));
            }
            PrimitiveDataValue::U8(data_to_analyze[0])
        }

        PrimitiveDataType::U16 => {
            let data_u16 = u16::from_le_bytes(data_to_analyze.try_into().map_err(|_| (
                StatusCode::BAD_REQUEST,
                format!(
                    "Data constraint expects 2 bytes for U16, found {} bytes",
                    data_to_analyze.len()
                ),
            ))?);
            PrimitiveDataValue::U16(data_u16)
        }

        PrimitiveDataType::U32 => {
            let data_u32 = u32::from_le_bytes(data_to_analyze.try_into().map_err(|_| (
                StatusCode::BAD_REQUEST,
                format!(
                    "Data constraint expects 4 bytes for U32, found {} bytes",
                    data_to_analyze.len()
                ),
            ))?);
            PrimitiveDataValue::U32(data_u32)
        }

        PrimitiveDataType::U64 => {
            let data_u64 = u64::from_le_bytes(data_to_analyze.try_into().map_err(|_| (
                StatusCode::BAD_REQUEST,
                format!(
                    "Data constraint expects 8 bytes for U64, found {} bytes",
                    data_to_analyze.len()
                ),
            ))?);
            PrimitiveDataValue::U64(data_u64)
        }
    };

    compare_primitive_data_types(data_to_analyze_deserialized, &constraint.constraint).map_err(|err| {
        (
            StatusCode::BAD_REQUEST,
            format!("Data constraint not satisfied: {err}"),
        )
    })?;

    Ok(())
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
                    "The http origin header or query parameter domain is not registered with the paymaster: {domain}"
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
    let DomainState {
        keypair,
        tx_variations,
    } = get_domain_state(&state, domain, origin)?;

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
        &state.global_program_whitelist,
        tx_variations,
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
        keypair,
        tx_variations: _,
    } = get_domain_state(&state, domain, origin)?;
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
                tx_variations,
            } | {
                let keypair = Keypair::from_seed_and_derivation_path(
                    &solana_seed_phrase::generate_seed_from_seed_phrase_and_passphrase(
                        &mnemonic, &domain,
                    ),
                    Some(DerivationPath::new_bip44(Some(0), Some(0))),
                )
                .expect("Failed to derive keypair from mnemonic_file");

                (domain, DomainState {
                    keypair,
                    tx_variations,
                })
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
            global_program_whitelist,
            max_sponsor_spending,
            domains,
            rpc,
        }));
    let listener = tokio::net::TcpListener::bind(listen_address).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
