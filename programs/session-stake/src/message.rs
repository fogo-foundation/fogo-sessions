use {
  anchor_lang::prelude::Pubkey,
  nom::{
    bytes::complete::tag,
    character::complete::line_ending,
    combinator::{eof, map},
    error::{Error, ParseError},
    sequence::delimited,
    AsChar, Compare, Err, IResult, Input, Offset, ParseTo, Parser,
  },
  solana_intents::tag_key_value,
  solana_stake_interface::state::StakeAuthorize,
};

const MESSAGE_PREFIX: &str =
  "Stake Authority Change:\nYou are granting another address control over your stake account.\n";

#[derive(Debug, PartialEq)]
pub struct AuthorizeMessage {
  pub chain_id:       String,
  pub stake_account:  Pubkey,
  pub authority_type: String,
  pub new_authority:  Pubkey,
  pub nonce:          u64,
}

impl AuthorizeMessage {
  pub fn stake_authorize(&self) -> Option<StakeAuthorize> {
    match self.authority_type.as_str() {
      "delegate_staking"   => Some(StakeAuthorize::Staker),
      "transfer_ownership" => Some(StakeAuthorize::Withdrawer),
      _                    => None,
    }
  }
}

impl TryFrom<Vec<u8>> for AuthorizeMessage {
  type Error = Err<Error<Vec<u8>>>;

  fn try_from(message: Vec<u8>) -> core::result::Result<Self, Self::Error> {
    match message_v0.parse(message.as_slice()) {
      Ok((_, message)) => Ok(message),
      Err(e) => Err(Err::<Error<&[u8]>>::to_owned(e)),
    }
  }
}

fn message_v0<I, E>(input: I) -> IResult<I, AuthorizeMessage, E>
where
  I: Input,
  I: ParseTo<String>,
  I: ParseTo<Pubkey>,
  I: ParseTo<u64>,
  I: Offset,
  I: for<'a> Compare<&'a str>,
  <I as Input>::Item: AsChar,
  E: ParseError<I>,
{
  map(
    delimited(
      (tag(MESSAGE_PREFIX), line_ending),
      (
        tag_key_value("chain_id"),
        tag_key_value("stake_account"),
        tag_key_value("authority_type"),
        tag_key_value("new_authority"),
        tag_key_value("nonce"),
      ),
      eof,
    ),
    |(chain_id, stake_account, authority_type, new_authority, nonce)| AuthorizeMessage {
      chain_id,
      stake_account,
      authority_type,
      new_authority,
      nonce,
    },
  )
  .parse(input)
}

