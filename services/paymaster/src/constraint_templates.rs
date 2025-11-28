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
}

impl TransactionVariation {
    /// The template for the transaction variation that establishes a session.
    pub fn session_establishment_variation(max_gas_spend: u64) -> TransactionVariation {
        TransactionVariation::V1(VariationOrderedInstructionConstraints {
            name: "Session Establishment".to_string(),
            instructions: vec![
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
}