use intent_transfer::bridge::processor::bridge_ntt_tokens::H160;

use crate::constraint::{
    AccountConstraint, ContextualPubkey, DataConstraint, DataConstraintSpecification, DataType,
    DataValue, InstructionConstraint, TransactionVariation, VariationOrderedInstructionConstraints,
};

impl InstructionConstraint {
    /// The template for the constraint for the ed25519_program instruction used to verify a single intent signature.
    pub fn intent_instruction_constraint() -> InstructionConstraint {
        InstructionConstraint {
            program: solana_program::ed25519_program::id(),
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
    pub fn start_session_instruction_constraint() -> InstructionConstraint {
        InstructionConstraint {
            program: fogo_sessions_sdk::session::SESSION_MANAGER_ID,
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
    pub fn revoke_session_instruction_constraint() -> InstructionConstraint {
        InstructionConstraint {
            program: fogo_sessions_sdk::session::SESSION_MANAGER_ID,
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

    pub fn create_ata_idempotent_instruction_constraint(required: bool) -> InstructionConstraint {
        InstructionConstraint {
            program: spl_associated_token_account::id(),
            accounts: vec![],
            data: vec![
                // instruction = 1 (CreateAssociatedTokenAccountIdempotent)
                DataConstraint {
                    start_byte: 0,
                    data_type: DataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U8(1)]),
                },
            ],
            required,
        }
    }

    /// The template for the constraint for the SendTokens intent transfer instruction.
    pub fn intent_transfer_send_tokens_instruction_constraint() -> InstructionConstraint {
        InstructionConstraint {
            program: fogo_sessions_sdk::intent_transfer::INTENT_TRANSFER_PROGRAM_ID,
            accounts: vec![],
            data: vec![
                // instruction = 0 (SendTokens)
                DataConstraint {
                    start_byte: 0,
                    data_type: DataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U8(0)]),
                },
            ],
            required: true,
        }
    }

    /// The template for the constraint for the BridgeNttTokens intent transfer instruction.
    pub fn intent_transfer_bridge_ntt_instruction_constraint(
        ntt_quoter: H160,
    ) -> InstructionConstraint {
        InstructionConstraint {
            program: fogo_sessions_sdk::intent_transfer::INTENT_TRANSFER_PROGRAM_ID,
            accounts: vec![],
            data: vec![
                // instruction = 1 (BridgeNttTokens)
                DataConstraint {
                    start_byte: 0,
                    data_type: DataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![DataValue::U8(1)]),
                },
                DataConstraint {
                    start_byte: 1,
                    data_type: DataType::NttSignedQuote,
                    constraint: DataConstraintSpecification::EqualTo(vec![
                        DataValue::NttSignedQuoter(ntt_quoter),
                    ]),
                },
            ],
            required: true,
        }
    }
}

impl TransactionVariation {
    /// The template for the transaction variation that establishes a session.
    pub fn session_establishment_variation(max_gas_spend: u64) -> TransactionVariation {
        TransactionVariation::V1(VariationOrderedInstructionConstraints {
            name: "Session Establishment".to_string(),
            instructions: vec![
                // Allow for idempotent associated token account creation. For now, we allow up to 4 such optional instructions.
                InstructionConstraint::create_ata_idempotent_instruction_constraint(false),
                InstructionConstraint::create_ata_idempotent_instruction_constraint(false),
                InstructionConstraint::create_ata_idempotent_instruction_constraint(false),
                InstructionConstraint::create_ata_idempotent_instruction_constraint(false),
                InstructionConstraint::intent_instruction_constraint(),
                InstructionConstraint::start_session_instruction_constraint(),
            ],
            max_gas_spend,
        })
    }

    /// The template for the transaction variation that revokes a session.
    pub fn session_revocation_variation(max_gas_spend: u64) -> TransactionVariation {
        TransactionVariation::V1(VariationOrderedInstructionConstraints {
            name: "Session Revocation".to_string(),
            instructions: vec![InstructionConstraint::revoke_session_instruction_constraint()],
            max_gas_spend,
        })
    }

    /// The template for the transaction variation that conducts intent intrachain transfers.
    pub fn intent_transfer_send_tokens_variation(max_gas_spend: u64) -> TransactionVariation {
        TransactionVariation::V1(VariationOrderedInstructionConstraints {
            name: "Intent Transfer".to_string(),
            instructions: vec![
                InstructionConstraint::intent_instruction_constraint(),
                InstructionConstraint::intent_transfer_send_tokens_instruction_constraint(),
            ],
            max_gas_spend,
        })
    }

    /// The template for the transaction variation that conducts intent transfer bridging via NTT.
    pub fn intent_transfer_bridge_ntt_variation(
        ntt_quoter: H160,
        max_gas_spend: u64,
    ) -> TransactionVariation {
        TransactionVariation::V1(VariationOrderedInstructionConstraints {
            name: "Intent NTT Bridge".to_string(),
            instructions: vec![
                InstructionConstraint::intent_instruction_constraint(),
                InstructionConstraint::intent_transfer_bridge_ntt_instruction_constraint(
                    ntt_quoter,
                ),
            ],
            max_gas_spend,
        })
    }
}
