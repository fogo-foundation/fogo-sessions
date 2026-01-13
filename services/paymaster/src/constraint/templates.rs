use std::collections::hash_map::Entry;
use std::collections::HashMap;

use crate::constraint::SubstantiveProgramId;
use crate::constraint::{
    AccountConstraint, ContextualPubkey, DataConstraint, DataConstraintSpecification, DataType,
    DataValue, ParsedInstructionConstraint, ParsedTransactionVariation,
    ParsedVariationOrderedInstructionConstraints,
};

impl ParsedInstructionConstraint {
    /// The template for the constraint for the ed25519_program instruction used to verify a single intent signature.
    fn intent_instruction_constraint() -> ParsedInstructionConstraint {
        ParsedInstructionConstraint {
            program: SubstantiveProgramId(solana_program::ed25519_program::id()),
            accounts: vec![],
            data: vec![
                // numSignatures = 1
                DataConstraint {
                    start_byte: 0,
                    data_type: DataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U8(1)]),
                },
                // padding = 0
                DataConstraint {
                    start_byte: 1,
                    data_type: DataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U8(0)]),
                },
                // signatureOffset = 16 + 32 = 48
                DataConstraint {
                    start_byte: 2,
                    data_type: DataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U16(48)]),
                },
                // signatureInstructionIndex = 0xffff
                DataConstraint {
                    start_byte: 4,
                    data_type: DataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U16(
                        u16::MAX,
                    )]),
                },
                // publicKeyOffset = 16
                DataConstraint {
                    start_byte: 6,
                    data_type: DataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U16(16)]),
                },
                // publicKeyInstructionIndex = 0xffff
                DataConstraint {
                    start_byte: 8,
                    data_type: DataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U16(
                        u16::MAX,
                    )]),
                },
                // messageOffset = 16 + 32 + 64 = 112
                DataConstraint {
                    start_byte: 10,
                    data_type: DataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U16(112)]),
                },
                // messageInstructionIndex = 0xffff
                DataConstraint {
                    start_byte: 14,
                    data_type: DataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U16(
                        u16::MAX,
                    )]),
                },
            ],
            required: true,
        }
    }

    /// The template for the constraint for the StartSession instruction from the session manager program.
    fn start_session_instruction_constraint() -> ParsedInstructionConstraint {
        ParsedInstructionConstraint {
            program: SubstantiveProgramId(fogo_sessions_sdk::session::SESSION_MANAGER_ID),
            accounts: vec![
                AccountConstraint {
                    index: 0,
                    include: vec![ContextualPubkey::Sponsor],
                    exclude: vec![],
                },
                AccountConstraint {
                    index: 2,
                    include: vec![ContextualPubkey::NonFeePayerSigner],
                    exclude: vec![],
                },
                AccountConstraint {
                    index: 4,
                    include: vec![ContextualPubkey::DomainRegistry],
                    exclude: vec![],
                },
            ],
            data: vec![
                // instruction = 0 (StartSession)
                DataConstraint {
                    start_byte: 0,
                    data_type: DataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U8(0)]),
                },
            ],
            required: true,
        }
    }

    /// The template for the constraint for the RevokeSession instruction from the session manager program.
    fn revoke_session_instruction_constraint() -> ParsedInstructionConstraint {
        ParsedInstructionConstraint {
            program: SubstantiveProgramId(fogo_sessions_sdk::session::SESSION_MANAGER_ID),
            accounts: vec![AccountConstraint {
                index: 0,
                include: vec![ContextualPubkey::NonFeePayerSigner],
                exclude: vec![],
            }],
            data: vec![
                // instruction = 1 (RevokeSession)
                DataConstraint {
                    start_byte: 0,
                    data_type: DataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U8(1)]),
                },
            ],
            required: true,
        }
    }

    /// The template for the constraint for transferring FOGO to one's ATA account via system_program::session_wrap
    pub fn session_wrap_instruction_constraint() -> ParsedInstructionConstraint {
        ParsedInstructionConstraint {
            program: SubstantiveProgramId(solana_program::system_program::id()),
            accounts: vec![],
            data: vec![
                // instruction = 4_000_000 (SessionWrap)
                DataConstraint {
                    start_byte: 0,
                    data_type: DataType::U32,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U32(
                        4_000_000,
                    )]),
                },
            ],
            required: false,
        }
    }

    /// The template for the constraint for creating an ATA idempotently
    pub fn create_ata_idempotent_instruction_constraint() -> ParsedInstructionConstraint {
        ParsedInstructionConstraint {
            program: SubstantiveProgramId(spl_associated_token_account::id()),
            accounts: vec![AccountConstraint {
                index: 0,
                include: vec![ContextualPubkey::NonFeePayerSigner],
                exclude: vec![],
            }],
            data: vec![
                // instruction = 1 (CreateIdempotent)
                DataConstraint {
                    start_byte: 0,
                    data_type: DataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U8(1)]),
                },
            ],
            required: false,
        }
    }

    /// The template for the constraint for syncing a wrapped native token account
    pub fn sync_native_instruction_constraint() -> ParsedInstructionConstraint {
        ParsedInstructionConstraint {
            program: SubstantiveProgramId(spl_token::id()),
            accounts: vec![],
            data: vec![
                // instruction = 17 (SyncNative)
                DataConstraint {
                    start_byte: 0,
                    data_type: DataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U8(17)]),
                },
            ],
            required: false,
        }
    }

    /// The template for the constraint for closing a token account
    pub fn close_token_account_constraint() -> ParsedInstructionConstraint {
        ParsedInstructionConstraint {
            program: SubstantiveProgramId(spl_token::id()),
            accounts: vec![],
            data: vec![
                // instruction = 9 (CloseAccount)
                DataConstraint {
                    start_byte: 0,
                    data_type: DataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U8(9)]),
                },
            ],
            required: false,
        }
    }
}

const DEFAULT_TEMPLATE_MAX_GAS_SPEND: u64 = 15_000;
impl ParsedTransactionVariation {
    /// The template for the transaction variation that establishes a session.
    pub fn session_establishment_variation(max_gas_spend: u64) -> ParsedTransactionVariation {
        ParsedTransactionVariation::V1(ParsedVariationOrderedInstructionConstraints {
            name: "Session Establishment".to_string(),
            instructions: vec![
                ParsedInstructionConstraint::intent_instruction_constraint(),
                ParsedInstructionConstraint::start_session_instruction_constraint(),
            ],
            max_gas_spend,
            paymaster_fee_lamports: None,
        })
    }

    /// The template for the transaction variation that revokes a session.
    pub fn session_revocation_variation(max_gas_spend: u64) -> ParsedTransactionVariation {
        ParsedTransactionVariation::V1(ParsedVariationOrderedInstructionConstraints {
            name: "Session Revocation".to_string(),
            instructions: vec![
                ParsedInstructionConstraint::revoke_session_instruction_constraint(),
            ],
            max_gas_spend,
            paymaster_fee_lamports: None,
        })
    }
}

fn insert_template_variation(
    tx_variations: &mut HashMap<String, ParsedTransactionVariation>,
    variation: ParsedTransactionVariation,
) -> anyhow::Result<()> {
    let key = variation.name().to_string();
    match tx_variations.entry(key.clone()) {
        Entry::Vacant(entry) => {
            entry.insert(variation);
        }
        Entry::Occupied(_) => {
            return Err(anyhow::anyhow!(format!(
                "Template transaction variation '{key}' conflicts with user-defined variation"
            )))
        }
    }
    Ok(())
}

pub fn insert_session_management_variations(
    tx_variations: &mut HashMap<String, ParsedTransactionVariation>,
) -> anyhow::Result<()> {
    insert_template_variation(
        tx_variations,
        ParsedTransactionVariation::session_establishment_variation(DEFAULT_TEMPLATE_MAX_GAS_SPEND),
    )?;
    insert_template_variation(
        tx_variations,
        ParsedTransactionVariation::session_revocation_variation(DEFAULT_TEMPLATE_MAX_GAS_SPEND),
    )?;
    Ok(())
}
