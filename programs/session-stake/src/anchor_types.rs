use {
  anchor_lang::prelude::*,
  solana_stake_interface::state::StakeStateV2,
};

#[derive(Clone, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
pub enum AuthorityType {
  Staker,
  Withdrawer,
}

#[derive(Clone)]
pub struct StakeAccount(pub StakeStateV2);

#[cfg(feature = "idl-build")]
impl anchor_lang::IdlBuild for StakeAccount {}

#[cfg(feature = "idl-build")]
impl anchor_lang::Discriminator for StakeAccount {
  const DISCRIMINATOR: &'static [u8] = &[];
}

impl std::ops::Deref for StakeAccount {
  type Target = StakeStateV2;

  fn deref(&self) -> &Self::Target {
    &self.0
  }
}

impl anchor_lang::AccountDeserialize for StakeAccount {
  fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
    StakeStateV2::deserialize(buf)
      .map(StakeAccount)
      .map_err(|_| anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into())
  }

  fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
    Self::try_deserialize(buf)
  }
}

impl anchor_lang::AccountSerialize for StakeAccount {
  fn try_serialize<W: std::io::Write>(&self, _writer: &mut W) -> Result<()> {
    Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into())
  }
}

impl anchor_lang::Owner for StakeAccount {
  fn owner() -> Pubkey {
    solana_stake_interface::program::ID
  }
}
