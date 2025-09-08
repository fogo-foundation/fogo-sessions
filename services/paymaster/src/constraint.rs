use serde::{Serialize, Deserialize};
use solana_pubkey::Pubkey;
use utoipa::ToSchema;
use serde_with::{serde_as, DisplayFromStr};

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(tag = "version")]
pub enum TransactionVariation {
    #[serde(rename = "v1")]
    #[schema(title = "v1")]
    V1(TransactionVariationV1),
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct TransactionVariationV1 {
	pub name: String,
    #[serde(default)]
	pub instructions: Vec<InstructionConstraint>,
	pub rate_limits: RateLimits,
	pub max_gas_spend: u64,
}


#[derive(Serialize, Deserialize, ToSchema)]
pub struct RateLimits {
	session_per_min: Option<u64>,
	ip_per_min: Option<u64>,
}


#[serde_as]
#[derive(Serialize, Deserialize, ToSchema)]
pub struct InstructionConstraint {
    #[schema(example = "So11111111111111111111111111111111111111111", value_type = String)]
    #[serde_as(as = "DisplayFromStr")]
	pub program: Pubkey,
    #[serde(default)]
	pub accounts: Vec<AccountConstraint>,
    #[serde(default)]
	pub data: Vec<DataConstraint>,
    pub required: bool,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct AccountConstraint {
	pub index: u16,
	pub include: Vec<ContextualPubkey>,
	pub exclude: Vec<ContextualPubkey>,
}

#[serde_as]
#[derive(Serialize, Deserialize, ToSchema)]
pub enum ContextualPubkey {
	Explicit{
        #[schema(example = "So11111111111111111111111111111111111111111", value_type = String)]
        #[serde_as(as = "DisplayFromStr")]
        pubkey: Pubkey
    },
	Session,
	Sponsor,
}


#[derive(Serialize, Deserialize, ToSchema)]
pub struct DataConstraint {
	pub start_byte: u16,
	pub end_byte: u16,
	pub data_type: PrimitiveDataType,
	pub constraint: DataConstraintSpecification,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub enum PrimitiveDataType {
	U8(Option<u8>),
	U16(Option<u16>),
	U32(Option<u32>),
	U64(Option<u64>),
	Bool(Option<bool>),
}

#[derive(Serialize, Deserialize, ToSchema)]
pub enum DataConstraintSpecification {
	LessThan(PrimitiveDataType),
	GreaterThan(PrimitiveDataType),
	EqualTo(Vec<PrimitiveDataType>),
	Neq(Vec<PrimitiveDataType>),
}

pub fn compare_primitive_data_types(a: PrimitiveDataType, constraint: &DataConstraintSpecification) -> Result<(), String> {    
    let meets = match constraint {
        DataConstraintSpecification::LessThan(value) => match (a, value) {
            (PrimitiveDataType::U8(Some(a)), PrimitiveDataType::U8(Some(b))) => a < *b,
            (PrimitiveDataType::U16(Some(a)), PrimitiveDataType::U16(Some(b))) => a < *b,
            (PrimitiveDataType::U32(Some(a)), PrimitiveDataType::U32(Some(b))) => a < *b,
            (PrimitiveDataType::U64(Some(a)), PrimitiveDataType::U64(Some(b))) => a < *b,
            (PrimitiveDataType::Bool(Some(_)), PrimitiveDataType::Bool(Some(_))) => return Err("LessThan not applicable for bool".into()),
            _ => return Err("Incompatible primitive data types".into()),
        },
       
        DataConstraintSpecification::GreaterThan(value) => match (a, value) {
            (PrimitiveDataType::U8(Some(a)), PrimitiveDataType::U8(Some(b))) => a > *b,
            (PrimitiveDataType::U16(Some(a)), PrimitiveDataType::U16(Some(b))) => a > *b,
            (PrimitiveDataType::U32(Some(a)), PrimitiveDataType::U32(Some(b))) => a > *b,
            (PrimitiveDataType::U64(Some(a)), PrimitiveDataType::U64(Some(b))) => a > *b,
            (PrimitiveDataType::Bool(Some(_)), PrimitiveDataType::Bool(Some(_))) => return Err("GreaterThan not applicable for bool".into()),
            _ => return Err("Incompatible primitive data types".into()),
        },

        DataConstraintSpecification::EqualTo(values) => {
            for value in values {
                let is_equal = match (&a, value) {
                    (PrimitiveDataType::U8(Some(a)), PrimitiveDataType::U8(Some(b))) => a == b,
                    (PrimitiveDataType::U16(Some(a)), PrimitiveDataType::U16(Some(b))) => a == b,
                    (PrimitiveDataType::U32(Some(a)), PrimitiveDataType::U32(Some(b))) => a == b,
                    (PrimitiveDataType::U64(Some(a)), PrimitiveDataType::U64(Some(b))) => a == b,
                    (PrimitiveDataType::Bool(Some(a)), PrimitiveDataType::Bool(Some(b))) => a == b,
                    _ => return Err("Incompatible primitive data types".into()),
                };
                if is_equal {
                    return Ok(());
                }
            }
            return Err("No matching value found".into());
        },

        DataConstraintSpecification::Neq(values) => {
            for value in values {
                let is_equal = match (&a, value) {
                    (PrimitiveDataType::U8(Some(a)), PrimitiveDataType::U8(Some(b))) => a == b,
                    (PrimitiveDataType::U16(Some(a)), PrimitiveDataType::U16(Some(b))) => a == b,
                    (PrimitiveDataType::U32(Some(a)), PrimitiveDataType::U32(Some(b))) => a == b,
                    (PrimitiveDataType::U64(Some(a)), PrimitiveDataType::U64(Some(b))) => a == b,
                    (PrimitiveDataType::Bool(Some(a)), PrimitiveDataType::Bool(Some(b))) => a == b,
                    _ => return Err("Incompatible primitive data types".into()),
                };
                if is_equal {
                    return Err("Value matches an excluded value".into());
                }
            }
            return Ok(());
        },
    };

    if meets {
        Ok(())
    } else {
        Err("Constraint not met".into())
    }
}