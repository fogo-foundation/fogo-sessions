use borsh::BorshDeserialize;
use solana_compute_budget_interface::ComputeBudgetInstruction;
use solana_message::compiled_instruction::CompiledInstruction;
use solana_message::VersionedMessage;
use solana_pubkey::Pubkey;
use solana_sdk_ids::{ed25519_program, secp256k1_program, secp256r1_program};
use solana_transaction::versioned::VersionedTransaction;

const LAMPORTS_PER_SIGNATURE: u64 = 5000;
const DEFAULT_COMPUTE_UNIT_LIMIT: u64 = 200_000;

/// Computes the priority fee from the transaction's compute budget instructions.
/// Extracts the compute unit price and limit from the instructions. Uses default values if not set.
/// If multiple compute budget instructions are present, the validation will fail.
/// If compute budget instructions have invalid data, the validation will fail.
fn process_compute_budget_instructions(transaction: &VersionedTransaction) -> anyhow::Result<u64> {
    let mut cu_limit = None;
    let mut micro_lamports_per_cu = None;

    let msg = &transaction.message;
    let instructions: Vec<&CompiledInstruction> = match msg {
        VersionedMessage::Legacy(m) => m.instructions.iter().collect(),
        VersionedMessage::V0(m) => m.instructions.iter().collect(),
    };

    // should not support multiple compute budget instructions: https://github.com/solana-labs/solana/blob/ca115594ff61086d67b4fec8977f5762e526a457/program-runtime/src/compute_budget.rs#L162
    for ix in instructions {
        if ix.program_id(msg.static_account_keys()) != &solana_compute_budget_interface::id() {
            continue;
        }

        if let Ok(cu_ix) = ComputeBudgetInstruction::try_from_slice(&ix.data) {
            match cu_ix {
                ComputeBudgetInstruction::SetComputeUnitLimit(units) => {
                    if cu_limit.is_some() {
                        anyhow::bail!("Multiple SetComputeUnitLimit instructions found");
                    }
                    cu_limit = Some(u64::from(units));
                }
                ComputeBudgetInstruction::SetComputeUnitPrice(micro_lamports) => {
                    if micro_lamports_per_cu.is_some() {
                        anyhow::bail!("Multiple SetComputeUnitPrice instructions found",);
                    }
                    micro_lamports_per_cu = Some(micro_lamports);
                }
                _ => {}
            }
        } else {
            anyhow::bail!("Invalid compute budget instruction data");
        }
    }

    let priority_fee = cu_limit
        .unwrap_or(DEFAULT_COMPUTE_UNIT_LIMIT)
        .saturating_mul(micro_lamports_per_cu.unwrap_or(0))
        / 1_000_000;
    Ok(priority_fee)
}

/// The Solana precompile programs that verify signatures.
const PRECOMPILE_SIGNATURE_PROGRAMS: &[Pubkey] = &[
    ed25519_program::ID,
    secp256k1_program::ID,
    secp256r1_program::ID,
];

/// Counts the number of signatures verified by precompile programs in the transaction.
/// Based on core solana fee calc logic: https://github.com/dourolabs/agave/blob/cb32984a9b0d5c2c6f7775bed39b66d3a22e3c46/fee/src/lib.rs#L65-L83
fn get_number_precompile_signatures(transaction: &VersionedTransaction) -> u64 {
    transaction
        .message
        .instructions()
        .iter()
        .filter(|ix| {
            let program_id = ix.program_id(transaction.message.static_account_keys());
            PRECOMPILE_SIGNATURE_PROGRAMS.contains(program_id)
        })
        .map(|ix| u64::from(ix.data.first().copied().unwrap_or(0)))
        .fold(0u64, |acc, x| acc.saturating_add(x))
}

/// Computes the gas spend (in lamports) for a transaction based on signatures and priority fee.
pub fn compute_gas_spend(transaction: &VersionedTransaction) -> anyhow::Result<u64> {
    let n_signatures = (transaction.signatures.len() as u64)
        .saturating_add(get_number_precompile_signatures(transaction));
    let priority_fee = process_compute_budget_instructions(transaction)?;
    Ok((n_signatures.saturating_mul(LAMPORTS_PER_SIGNATURE)).saturating_add(priority_fee))
}
