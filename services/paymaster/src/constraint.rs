use serde::{Serialize, Deserialize};
use solana_pubkey::Pubkey;
use utoipa::ToSchema;
use serde_with::{serde_as, DisplayFromStr};

use crate::utils::deserialize_pubkey_vec;

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(tag = "version")]
pub enum TransactionVariation {
    #[serde(rename = "v0")]
    #[schema(title = "v0")]
    V0(VariationProgramWhitelist),

    #[serde(rename = "v1_sessionful")]
    #[schema(title = "v1_sessionful")]
    V1Sessionful(VariationOrderedInstructionConstraints<ContextualPubkeySessionful>),

    #[serde(rename = "v1_sessionless")]
    #[schema(title = "v1_sessionless")]
    V1Sessionless(VariationOrderedInstructionConstraints<ContextualPubkeySessionless>),
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde_as]
pub struct VariationProgramWhitelist {
    pub name: String,

    #[schema(example = "[\"So11111111111111111111111111111111111111111\"]", value_type = Vec<String>)]
    #[serde(deserialize_with = "deserialize_pubkey_vec")]
    pub whitelisted_programs: Vec<Pubkey>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct VariationOrderedInstructionConstraints<T>
where
    T: ContextualPubkeyTrait,
{
	pub name: String,
	pub instructions: Vec<InstructionConstraint<T>>,
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
pub struct InstructionConstraint<T> 
where
    T: ContextualPubkeyTrait,
{
    #[schema(example = "So11111111111111111111111111111111111111111", value_type = String)]
    #[serde_as(as = "DisplayFromStr")]
	pub program: Pubkey,
	pub accounts: Vec<AccountConstraint<T>>,
	pub data: Vec<DataConstraint>,
    pub required: bool,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct AccountConstraint<T> 
where
    T: ContextualPubkeyTrait,
{
	pub index: u16,
	pub include: Vec<T>,
	pub exclude: Vec<T>,
}



#[serde_as]
#[derive(Serialize, Deserialize, ToSchema)]
pub enum ContextualPubkeySessionful {
	Explicit{
        #[schema(example = "So11111111111111111111111111111111111111111", value_type = String)]
        #[serde_as(as = "DisplayFromStr")]
        pubkey: Pubkey
    },
	Session,
	Sponsor,
}

#[serde_as]
#[derive(Serialize, Deserialize, ToSchema)]
pub enum ContextualPubkeySessionless {
	Explicit{
        #[schema(example = "So11111111111111111111111111111111111111111", value_type = String)]
        #[serde_as(as = "DisplayFromStr")]
        pubkey: Pubkey
    },
	Sponsor,
}

pub trait ContextualPubkeyTrait {
    fn matches_account(&self, account: &Pubkey, session: Option<&Pubkey>, sponsor: &Pubkey, expect_include: bool) -> Option<String>;
}

impl ContextualPubkeyTrait for ContextualPubkeySessionful {
    fn matches_account(&self, account: &Pubkey, session: Option<&Pubkey>, sponsor: &Pubkey, expect_include: bool) -> Option<String> {
        match self {
            ContextualPubkeySessionful::Explicit { pubkey } => {
                match (account == pubkey, expect_include) {
                    (true, true) => None,
                    (true, false) => Some(format!("Account {account} is explicitly excluded")),
                    (false, true) => Some(format!("Account {account} is not explicitly included")),
                    (false, false) => None,
                }
            }

            ContextualPubkeySessionful::Session => {
                match session {
                    Some(session) => match (account == session, expect_include) {
                        (true, true) => None,
                        (true, false) => Some(format!("Account {account} is excluded as session")),
                        (false, true) => Some(format!("Account {account} is not the session account")),
                        (false, false) => None,
                    }

                    None => Some(format!("Session missing from sessionful transaction"))
                }
            }

            ContextualPubkeySessionful::Sponsor => {
                match (account == sponsor, expect_include) {
                    (true, true) => None,
                    (true, false) => Some(format!("Account {account} is excluded as sponsor")),
                    (false, true) => Some(format!("Account {account} is not the sponsor account")),
                    (false, false) => None,
                }
            }
        }
    }
}

impl ContextualPubkeyTrait for ContextualPubkeySessionless {
    fn matches_account(&self, account: &Pubkey, _session: Option<&Pubkey>, sponsor: &Pubkey, expect_include: bool) -> Option<String> {
        match self {
            ContextualPubkeySessionless::Explicit { pubkey } => {
                match (account == pubkey, expect_include) {
                    (true, true) => None,
                    (true, false) => Some(format!("Account {account} is explicitly excluded")),
                    (false, true) => Some(format!("Account {account} is not explicitly included")),
                    (false, false) => None,
                }
            }

            ContextualPubkeySessionless::Sponsor => {
                match (account == sponsor, expect_include) {
                    (true, true) => None,
                    (true, false) => Some(format!("Account {account} is excluded as sponsor")),
                    (false, true) => Some(format!("Account {account} is not the sponsor account")),
                    (false, false) => None,
                }
            }
        }
    }
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
	U8,
	U16,
	U32,
	U64,
	Bool,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub enum PrimitiveDataValue {
    U8(u8),
    U16(u16),
    U32(u32),
    U64(u64),
    Bool(bool),
}

#[derive(Serialize, Deserialize, ToSchema)]
pub enum DataConstraintSpecification {
	LessThan(PrimitiveDataValue),
	GreaterThan(PrimitiveDataValue),
	EqualTo(Vec<PrimitiveDataValue>),
	Neq(Vec<PrimitiveDataValue>),
}

pub fn compare_primitive_data_types(a: PrimitiveDataValue, constraint: &DataConstraintSpecification) -> Result<(), String> {    
    let meets = match constraint {
        DataConstraintSpecification::LessThan(value) => match (a, value) {
            (PrimitiveDataValue::U8(a), PrimitiveDataValue::U8(b)) => a < *b,
            (PrimitiveDataValue::U16(a), PrimitiveDataValue::U16(b)) => a < *b,
            (PrimitiveDataValue::U32(a), PrimitiveDataValue::U32(b)) => a < *b,
            (PrimitiveDataValue::U64(a), PrimitiveDataValue::U64(b)) => a < *b,
            (PrimitiveDataValue::Bool(_), PrimitiveDataValue::Bool(_)) => return Err("LessThan not applicable for bool".into()),
            _ => return Err("Incompatible primitive data types".into()),
        },
       
        DataConstraintSpecification::GreaterThan(value) => match (a, value) {
            (PrimitiveDataValue::U8(a), PrimitiveDataValue::U8(b)) => a > *b,
            (PrimitiveDataValue::U16(a), PrimitiveDataValue::U16(b)) => a > *b,
            (PrimitiveDataValue::U32(a), PrimitiveDataValue::U32(b)) => a > *b,
            (PrimitiveDataValue::U64(a), PrimitiveDataValue::U64(b)) => a > *b,
            (PrimitiveDataValue::Bool(_), PrimitiveDataValue::Bool(_)) => return Err("GreaterThan not applicable for bool".into()),
            _ => return Err("Incompatible primitive data types".into()),
        },

        DataConstraintSpecification::EqualTo(values) => {
            for value in values {
                let is_equal = match (&a, value) {
                    (PrimitiveDataValue::U8(a), PrimitiveDataValue::U8(b)) => a == b,
                    (PrimitiveDataValue::U16(a), PrimitiveDataValue::U16(b)) => a == b,
                    (PrimitiveDataValue::U32(a), PrimitiveDataValue::U32(b)) => a == b,
                    (PrimitiveDataValue::U64(a), PrimitiveDataValue::U64(b)) => a == b,
                    (PrimitiveDataValue::Bool(a), PrimitiveDataValue::Bool(b)) => a == b,
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
                    (PrimitiveDataValue::U8(a), PrimitiveDataValue::U8(b)) => a == b,
                    (PrimitiveDataValue::U16(a), PrimitiveDataValue::U16(b)) => a == b,
                    (PrimitiveDataValue::U32(a), PrimitiveDataValue::U32(b)) => a == b,
                    (PrimitiveDataValue::U64(a), PrimitiveDataValue::U64(b)) => a == b,
                    (PrimitiveDataValue::Bool(a), PrimitiveDataValue::Bool(b)) => a == b,
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