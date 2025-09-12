use crate::config::{Config, Domain};
use crate::constraint::{
    compare_primitive_data_types, AccountConstraint, DataConstraint, InstructionConstraint,
    PrimitiveDataType, PrimitiveDataValue, TransactionVariation,
};
use crate::constraint_templates::{session_establishment_variation, session_revocation_variation};
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
use solana_compute_budget_interface::ComputeBudgetInstruction;
use solana_derivation_path::DerivationPath;
use solana_keypair::Keypair;
use solana_message::compiled_instruction::CompiledInstruction;
use solana_message::VersionedMessage;
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
    pub keypair: Keypair,
    pub enable_preflight_simulation: bool,
    pub tx_variations: Vec<TransactionVariation>,
}
pub struct ServerState {
    pub rpc: RpcClient,
    pub max_sponsor_spending: u64,
    pub domains: HashMap<String, DomainState>,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct SponsorAndSendPayload {
    pub transaction: String,
}

pub async fn validate_transaction(
    transaction: &VersionedTransaction,
    tx_variations: &[TransactionVariation],
    sponsor: &Pubkey,
    domain_registry_key: &Pubkey,
    rpc: &RpcClient,
    max_sponsor_spending: u64,
) -> Result<(), (StatusCode, String)> {
    if transaction.message.static_account_keys()[0] != *sponsor {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Transaction fee payer must be the sponsor: expected {}, got {}",
                sponsor,
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
                        format!("Missing or invalid signature for account {pubkey}").to_string(),
                    )
                })
        })?;

    let matches_variation = tx_variations.iter().any(|variation| {
        validate_transaction_against_variation(transaction, variation, sponsor, domain_registry_key).is_ok()
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
    domain_registry: &Pubkey,
) -> Result<(), (StatusCode, String)> {
    match tx_variation {
        TransactionVariation::V0(variation) => {
            validate_transaction_against_variation_v0(transaction, variation)
        }
        TransactionVariation::V1(variation) => {
            validate_transaction_against_variation_v1(transaction, variation, sponsor, domain_registry)
        }
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
                    "Transaction contains unauthorized program ID {program_id} for variation {}",
                    variation.name
                ),
            ));
        }
    }
    Ok(())
}

// TODO: incorporate rate limit checks
pub fn validate_transaction_against_variation_v1(
    transaction: &VersionedTransaction,
    variation: &crate::constraint::VariationOrderedInstructionConstraints,
    sponsor: &Pubkey,
    domain_registry: &Pubkey,
) -> Result<(), (StatusCode, String)> {
    check_gas_spend(transaction, variation.max_gas_spend)?;

    let instructions = transaction.message.instructions();

    let mut instruction_iter = instructions.iter().enumerate();
    let mut instruction_details = instruction_iter.next();

    let mut constraint_iter = variation.instructions.iter();
    let mut constraint = constraint_iter.next();

    while let (Some((instr_index, instr)), Some(constr)) = (instruction_details, constraint) {
        let result = validate_instruction_against_instruction_constraint(
            instr,
            instr_index,
            transaction.message.static_account_keys(),
            &transaction.signatures,
            sponsor,
            domain_registry,
            constr,
            &variation.name,
        );

        if result.is_err() {
            if constr.required {
                return result;
            } else {
                constraint = constraint_iter.next();
            }
        } else {
            instruction_details = instruction_iter.next();
            constraint = constraint_iter.next();
        }
    }

    if let Some((instruction_index, _)) = instruction_details {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Instruction {instruction_index} in transaction does not match any expected instructions for variation {}",
                variation.name
            )
        ));
    } else if let Some(curr_constraint) = constraint {
        let remaining_required_constraints: Vec<_> = std::iter::once(curr_constraint)
            .chain(constraint_iter)
            .filter(|c| c.required)
            .collect();
        if !remaining_required_constraints.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction is missing required instructions for variation {}",
                    variation.name
                ),
            ));
        }
    }

    Ok(())
}

pub const LAMPORTS_PER_SIGNATURE: u64 = 5000;
pub const DEFAULT_COMPUTE_UNIT_LIMIT: u64 = 200_000;

pub fn check_gas_spend(
    transaction: &VersionedTransaction,
    max_gas_spend: u64,
) -> Result<(), (StatusCode, String)> {
    let n_signatures = transaction.signatures.len() as u64;
    let priority_fee = get_priority_fee(transaction)?;
    let gas_spent = n_signatures * LAMPORTS_PER_SIGNATURE + priority_fee;
    if gas_spent > max_gas_spend {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Transaction gas spend {gas_spent} exceeds maximum allowed {max_gas_spend}",),
        ));
    }
    Ok(())
}

/// Computes the priority fee from the transaction's compute budget instructions.
/// Extracts the compute unit price and limit from the instructions. Uses default values if not set.
/// If multiple compute budget instructions are present, the transaction will fail.
pub fn get_priority_fee(transaction: &VersionedTransaction) -> Result<u64, (StatusCode, String)> {
    let mut cu_limit = None;
    let mut micro_lamports_per_cu = None;

    let msg = &transaction.message;
    let instructions: Vec<&CompiledInstruction> = match msg {
        VersionedMessage::Legacy(m) => m.instructions.iter().collect(),
        VersionedMessage::V0(m) => m.instructions.iter().collect(),
    };

    // should not support multiple compute budget instructions: https://github.com/solana-labs/solana/blob/ca115594ff61086d67b4fec8977f5762e526a457/program-runtime/src/compute_budget.rs#L162
    for ix in instructions {
        if let Ok(cu_ix) = bincode::deserialize::<ComputeBudgetInstruction>(&ix.data) {
            match cu_ix {
                ComputeBudgetInstruction::SetComputeUnitLimit(units) => {
                    if cu_limit.is_some() {
                        return Err((
                            StatusCode::BAD_REQUEST,
                            "Multiple SetComputeUnitLimit instructions found".to_string(),
                        ));
                    }
                    cu_limit = Some(u64::from(units));
                }
                ComputeBudgetInstruction::SetComputeUnitPrice(micro_lamports) => {
                    if micro_lamports_per_cu.is_some() {
                        return Err((
                            StatusCode::BAD_REQUEST,
                            "Multiple SetComputeUnitPrice instructions found".to_string(),
                        ));
                    }
                    micro_lamports_per_cu = Some(micro_lamports);
                }
                _ => {}
            }
        }
    }

    let priority_fee = cu_limit
        .unwrap_or(DEFAULT_COMPUTE_UNIT_LIMIT)
        .saturating_mul(micro_lamports_per_cu.unwrap_or(0))
        / 1_000_000;
    Ok(priority_fee)
}

pub fn validate_instruction_against_instruction_constraint(
    instruction: &CompiledInstruction,
    instruction_index: usize,
    accounts: &[Pubkey],
    signatures: &[Signature],
    sponsor: &Pubkey,
    domain_registry: &Pubkey,
    constraint: &InstructionConstraint,
    variation_name: &str,
) -> Result<(), (StatusCode, String)> {
    let program_id = instruction.program_id(accounts);
    if *program_id != constraint.program {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Transaction instruction {instruction_index} program ID {program_id} does not match expected ID {} for variation {variation_name}",
                constraint.program,
            ),
        ));
    }

    for (i, account_constraint) in constraint.accounts.iter().enumerate() {
        // TODO: account for lookup tables
        let account_index = instruction
            .accounts
            .get(usize::from(account_constraint.index))
            .ok_or_else(|| {
                (
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Transaction instruction {instruction_index} missing account at index {i} for variation {variation_name}",
                    ),
                )
            })?;
        let account = accounts.get(*account_index as usize).ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction instruction {instruction_index} account index {account_index} out of bounds for variation {variation_name}",
                ),
            )
        })?;
        let signers = accounts
            .iter()
            .take(signatures.len())
            .cloned()
            .collect::<Vec<_>>();
        check_account_constraint(
            account,
            account_constraint,
            signers,
            sponsor,
            domain_registry,
            instruction_index,
        )?;
    }

    for data_constraint in &constraint.data {
        check_data_constraint(&instruction.data, data_constraint, instruction_index)?;
    }

    Ok(())
}

pub fn check_account_constraint(
    account: &Pubkey,
    constraint: &AccountConstraint,
    signers: Vec<Pubkey>,
    sponsor: &Pubkey,
    domain_registry: &Pubkey,
    instruction_index: usize,
) -> Result<(), (StatusCode, String)> {
    constraint.exclude.iter().try_for_each(|excluded| {
        excluded.matches_account(account, &signers, sponsor, domain_registry, false, instruction_index)
    })?;

    constraint.include.iter().try_for_each(|included| {
        included.matches_account(account, &signers, sponsor, domain_registry, true, instruction_index)
    })?;

    Ok(())
}

pub fn check_data_constraint(
    data: &[u8],
    constraint: &DataConstraint,
    instruction_index: usize,
) -> Result<(), (StatusCode, String)> {
    let length = constraint.data_type.byte_length();
    let end_byte = length + usize::from(constraint.start_byte);
    if end_byte > data.len() {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Instruction {instruction_index}: Data constraint byte range {}-{} is out of bounds for data length {}",
                constraint.start_byte,
                end_byte - 1,
                data.len()
            ),
        ));
    }

    let data_to_analyze = &data[usize::from(constraint.start_byte)..end_byte];
    let data_to_analyze_deserialized = match constraint.data_type {
        PrimitiveDataType::Bool => PrimitiveDataValue::Bool(data_to_analyze[0] != 0),
        PrimitiveDataType::U8 => PrimitiveDataValue::U8(data_to_analyze[0]),
        PrimitiveDataType::U16 => {
            let data_u16 = u16::from_le_bytes(data_to_analyze.try_into().map_err(|_| {
                (
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Instruction {instruction_index}: Data constraint expects 2 bytes for U16, found {} bytes",
                        data_to_analyze.len()
                    ),
                )
            })?);
            PrimitiveDataValue::U16(data_u16)
        }

        PrimitiveDataType::U32 => {
            let data_u32 = u32::from_le_bytes(data_to_analyze.try_into().map_err(|_| {
                (
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Instruction {instruction_index}: Data constraint expects 4 bytes for U32, found {} bytes",
                        data_to_analyze.len()
                    ),
                )
            })?);
            PrimitiveDataValue::U32(data_u32)
        }

        PrimitiveDataType::U64 => {
            let data_u64 = u64::from_le_bytes(data_to_analyze.try_into().map_err(|_| {
                (
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Instruction {instruction_index}: Data constraint expects 8 bytes for U64, found {} bytes",
                        data_to_analyze.len()
                    ),
                )
            })?);
            PrimitiveDataValue::U64(data_u64)
        }

        PrimitiveDataType::Pubkey => {
            let data_pubkey = Pubkey::new_from_array(data_to_analyze.try_into().map_err(|_| {
                (
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Instruction {instruction_index}: Data constraint expects 32 bytes for Pubkey, found {} bytes",
                        data_to_analyze.len()
                    ),
                )
            })?);
            PrimitiveDataValue::Pubkey(data_pubkey)
        }
    };

    compare_primitive_data_types(data_to_analyze_deserialized, &constraint.constraint).map_err(
        |err| {
            (
                StatusCode::BAD_REQUEST,
                format!("Instruction {instruction_index}: Data constraint not satisfied: {err}"),
            )
        },
    )?;

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
    let DomainState {
        domain_registry_key,
        keypair,
        enable_preflight_simulation,
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
        tx_variations,
        &keypair.pubkey(),
        domain_registry_key,
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
                skip_preflight: !enable_preflight_simulation,
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
        domain_registry_key: _,
        keypair,
        enable_preflight_simulation: _,
        tx_variations: _,
    } = get_domain_state(&state, domain, origin)?;
    Ok(keypair.pubkey().to_string())
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
                let domain_registry_key = domain_registry::domain::Domain::new_checked(&domain).expect("Failed to derive domain registry key").get_domain_record_address();
                let keypair = Keypair::from_seed_and_derivation_path(
                    &solana_seed_phrase::generate_seed_from_seed_phrase_and_passphrase(
                        &mnemonic, &domain,
                    ),
                    Some(DerivationPath::new_bip44(Some(0), Some(0))),
                )
                .expect("Failed to derive keypair from mnemonic_file");

                let tx_variations = if enable_session_management {
                    let mut variations = tx_variations;
                    variations.push(session_establishment_variation());
                    variations.push(session_revocation_variation());
                    variations
                } else {
                    tx_variations
                };
                (
                    domain,
                    DomainState {
                        domain_registry_key,
                        keypair,
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
            rpc,
        }));
    let listener = tokio::net::TcpListener::bind(listen_address).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
