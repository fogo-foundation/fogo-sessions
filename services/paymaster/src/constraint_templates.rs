use crate::constraint::{
    AccountConstraint, ContextualPubkey, DataConstraint, DataConstraintSpecification,
    InstructionConstraint, PrimitiveDataType, PrimitiveDataValue, RateLimits, TransactionVariation,
    VariationOrderedInstructionConstraints,
};

impl InstructionConstraint {
    pub fn intent_instruction_constraint() -> InstructionConstraint {
        InstructionConstraint {
            program: solana_program::ed25519_program::id(),
            accounts: vec![],
            data: vec![
                // numSignatures = 1
                DataConstraint {
                    start_byte: 0,
                    data_type: PrimitiveDataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![PrimitiveDataValue::U8(
                        1,
                    )]),
                },
                // padding = 0
                DataConstraint {
                    start_byte: 1,
                    data_type: PrimitiveDataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![PrimitiveDataValue::U8(
                        0,
                    )]),
                },
                // signatureOffset = 16 + 32 = 48
                DataConstraint {
                    start_byte: 2,
                    data_type: PrimitiveDataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![
                        PrimitiveDataValue::U16(48),
                    ]),
                },
                // signatureInstructionIndex = 0xffff
                DataConstraint {
                    start_byte: 4,
                    data_type: PrimitiveDataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![
                        PrimitiveDataValue::U16(u16::MAX),
                    ]),
                },
                // publicKeyOffset = 16
                DataConstraint {
                    start_byte: 6,
                    data_type: PrimitiveDataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![
                        PrimitiveDataValue::U16(16),
                    ]),
                },
                // publicKeyInstructionIndex = 0xffff
                DataConstraint {
                    start_byte: 8,
                    data_type: PrimitiveDataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![
                        PrimitiveDataValue::U16(u16::MAX),
                    ]),
                },
                // messageOffset = 16 + 32 + 64 = 112
                DataConstraint {
                    start_byte: 10,
                    data_type: PrimitiveDataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![
                        PrimitiveDataValue::U16(112),
                    ]),
                },
                // messageInstructionIndex = 0xffff
                DataConstraint {
                    start_byte: 14,
                    data_type: PrimitiveDataType::U16,
                    constraint: DataConstraintSpecification::EqualTo(vec![
                        PrimitiveDataValue::U16(u16::MAX),
                    ]),
                },
            ],
            required: true,
        }
    }

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
                    include: vec![ContextualPubkey::Signer { index: -1 }],
                    exclude: vec![],
                },
            ],
            data: vec![
                // instruction = 0 (StartSession)
                DataConstraint {
                    start_byte: 0,
                    data_type: PrimitiveDataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![PrimitiveDataValue::U8(
                        0,
                    )]),
                },
            ],
            required: true,
        }
    }

    pub fn revoke_session_instruction_constraint() -> InstructionConstraint {
        InstructionConstraint {
            program: fogo_sessions_sdk::session::SESSION_MANAGER_ID,
            accounts: vec![
                AccountConstraint {
                    index: 0,
                    include: vec![ContextualPubkey::Signer { index: -1 }],
                    exclude: vec![],
                },
                AccountConstraint {
                    index: 1,
                    include: vec![ContextualPubkey::Sponsor],
                    exclude: vec![],
                },
            ],
            data: vec![
                // instruction = 1 (RevokeSession)
                DataConstraint {
                    start_byte: 0,
                    data_type: PrimitiveDataType::U8,
                    constraint: DataConstraintSpecification::EqualTo(vec![PrimitiveDataValue::U8(
                        1,
                    )]),
                },
            ],
            required: true,
        }
    }
}

impl TransactionVariation {
    pub fn session_establishment_variation() -> TransactionVariation {
        TransactionVariation::V1(VariationOrderedInstructionConstraints {
            name: "Session Establishment".to_string(),
            instructions: vec![
                InstructionConstraint::intent_instruction_constraint(),
                InstructionConstraint::start_session_instruction_constraint(),
            ],
            rate_limits: RateLimits {
                session_per_min: None,
                ip_per_min: None,
            },
            max_gas_spend: 100_000,
        })
    }

    pub fn session_revocation_variation() -> TransactionVariation {
        TransactionVariation::V1(VariationOrderedInstructionConstraints {
            name: "Session Revocation".to_string(),
            instructions: vec![InstructionConstraint::revoke_session_instruction_constraint()],
            rate_limits: RateLimits {
                session_per_min: None,
                ip_per_min: None,
            },
            max_gas_spend: 100_000,
        })
    }
}
