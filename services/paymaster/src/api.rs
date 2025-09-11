use crate::config::{Config, Domain};
use crate::constraint::{
    compare_primitive_data_types, AccountConstraint, DataConstraint, InstructionConstraint,
    PrimitiveDataType, PrimitiveDataValue, TransactionVariation,
};
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
    pub keypair: Keypair,
    pub tx_variations: Vec<TransactionVariation>,
}
pub struct ServerState {
    pub rpc: RpcClient,
    pub max_sponsor_spending: u64,
    pub domains: HashMap<String, DomainState>,
    pub lookup_table_cache: DashMap<Pubkey, Vec<Pubkey>>,
}

impl ServerState {
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
            self.update_lookup_table(table)?;
            self.query_lookup_table(table, index)
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

    // Updates the lookup table entry in the dashmap based on pulling from RPC.
    pub fn update_lookup_table(&self, table: &Pubkey) -> Result<(), (StatusCode, String)> {
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

        Ok(())
    }
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct SponsorAndSendPayload {
    pub transaction: String,
}

pub async fn validate_transaction(
    transaction: &VersionedTransaction,
    tx_variations: &[TransactionVariation],
    sponsor: &Pubkey,
    state: &ServerState,
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
        validate_transaction_against_variation(transaction, variation, sponsor, state).is_ok()
    });
    if !matches_variation {
        return Err((
            StatusCode::BAD_REQUEST,
            "Transaction does not match any allowed variations".to_string(),
        ));
    }

    // Simulate the transaction to check sponsor SOL spending
    let simulation_result = state
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
            let pre_balance = state.rpc.get_balance(sponsor).map_err(|err| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to get sponsor balance: {err}"),
                )
            })?;

            let balance_change = pre_balance.saturating_sub(current_balance);

            if balance_change > state.max_sponsor_spending {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Sponsor spending exceeds limit: {balance_change} lamports (max: {})",
                        state.max_sponsor_spending
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
    state: &ServerState,
) -> Result<(), (StatusCode, String)> {
    match tx_variation {
        TransactionVariation::V0(variation) => {
            validate_transaction_against_variation_v0(transaction, variation)
        }
        TransactionVariation::V1(variation) => {
            validate_transaction_against_variation_v1(transaction, variation, sponsor, state)
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
    state: &ServerState,
) -> Result<(), (StatusCode, String)> {
    let mut instruction_index = 0;
    check_gas_spend(transaction, variation.max_gas_spend)?;

    for constraint in variation.instructions.iter() {
        let result = validate_instruction_against_instruction_constraint(
            transaction,
            instruction_index,
            sponsor,
            constraint,
            &variation.name,
            state,
        );

        if result.is_err() {
            if constraint.required {
                return result;
            }
        } else {
            instruction_index += 1;
        }
    }

    if instruction_index != transaction.message.instructions().len() {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Instruction {instruction_index} does not match any expected instruction for variation {}",
                variation.name
            ),
        ));
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
    transaction: &VersionedTransaction,
    instruction_index: usize,
    sponsor: &Pubkey,
    constraint: &InstructionConstraint,
    variation_name: &str,
    state: &ServerState,
) -> Result<(), (StatusCode, String)> {
    let instruction = &transaction.message.instructions().get(instruction_index).ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            format!(
                "Transaction is missing instruction {instruction_index} for variation {variation_name}",
            ),
        )
    })?;
    let static_accounts = transaction.message.static_account_keys();
    let signatures = &transaction.signatures;

    let program_id = instruction.program_id(static_accounts);
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
        let account_index = usize::from(*instruction
            .accounts
            .get(usize::from(account_constraint.index))
            .ok_or_else(|| {
                (
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Transaction instruction {instruction_index} missing account at index {i} for variation {variation_name}",
                    ),
                )
            })?);
        let account = if let Some(acc) = static_accounts.get(account_index) {
            acc
        } else if let Some(lookup_tables) = transaction.message.address_table_lookups() {
            let lookup_accounts: Vec<(Pubkey, u8)> = lookup_tables
                .iter()
                .flat_map(|x| {
                    x.writable_indexes
                        .clone()
                        .into_iter()
                        .map(|y| (x.account_key, y))
                })
                .chain(lookup_tables.iter().flat_map(|x| {
                    x.readonly_indexes
                        .clone()
                        .into_iter()
                        .map(|y| (x.account_key, y))
                }))
                .collect();
            let account_position_lookups = account_index - static_accounts.len();
            &state.find_and_query_lookup_table(lookup_accounts, account_position_lookups)?
        } else {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Transaction instruction {instruction_index} account index {account_index} out of bounds for variation {variation_name}",
                ),
            ));
        };

        let signers = static_accounts
            .iter()
            .take(signatures.len())
            .cloned()
            .collect::<Vec<_>>();
        check_account_constraint(
            account,
            account_constraint,
            signers,
            sponsor,
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
    instruction_index: usize,
) -> Result<(), (StatusCode, String)> {
    constraint.exclude.iter().try_for_each(|excluded| {
        excluded.matches_account(account, &signers, sponsor, false, instruction_index)
    })?;

    constraint.include.iter().try_for_each(|included| {
        included.matches_account(account, &signers, sponsor, true, instruction_index)
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

    validate_transaction(&transaction, tx_variations, &keypair.pubkey(), &state).await?;

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
             }| {
                let keypair = Keypair::from_seed_and_derivation_path(
                    &solana_seed_phrase::generate_seed_from_seed_phrase_and_passphrase(
                        &mnemonic, &domain,
                    ),
                    Some(DerivationPath::new_bip44(Some(0), Some(0))),
                )
                .expect("Failed to derive keypair from mnemonic_file");

                (
                    domain,
                    DomainState {
                        keypair,
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
            lookup_table_cache: DashMap::new(),
        }));
    let listener = tokio::net::TcpListener::bind(listen_address).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
