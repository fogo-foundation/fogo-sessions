#![feature(prelude_import)]
#![allow(unexpected_cfgs)]
#[prelude_import]
use std::prelude::rust_2021::*;
#[macro_use]
extern crate std;
/// The static program ID
pub static ID: anchor_lang::solana_program::pubkey::Pubkey = anchor_lang::solana_program::pubkey::Pubkey::new_from_array([
    7u8,
    219u8,
    93u8,
    119u8,
    91u8,
    186u8,
    146u8,
    235u8,
    102u8,
    195u8,
    248u8,
    220u8,
    15u8,
    157u8,
    49u8,
    197u8,
    246u8,
    58u8,
    186u8,
    128u8,
    123u8,
    89u8,
    200u8,
    213u8,
    164u8,
    9u8,
    212u8,
    220u8,
    134u8,
    31u8,
    99u8,
    72u8,
]);
/// Const version of `ID`
pub const ID_CONST: anchor_lang::solana_program::pubkey::Pubkey = anchor_lang::solana_program::pubkey::Pubkey::new_from_array([
    7u8,
    219u8,
    93u8,
    119u8,
    91u8,
    186u8,
    146u8,
    235u8,
    102u8,
    195u8,
    248u8,
    220u8,
    15u8,
    157u8,
    49u8,
    197u8,
    246u8,
    58u8,
    186u8,
    128u8,
    123u8,
    89u8,
    200u8,
    213u8,
    164u8,
    9u8,
    212u8,
    220u8,
    134u8,
    31u8,
    99u8,
    72u8,
]);
/// Confirms that a given pubkey is equivalent to the program ID
pub fn check_id(id: &anchor_lang::solana_program::pubkey::Pubkey) -> bool {
    id == &ID
}
/// Returns the program ID
pub fn id() -> anchor_lang::solana_program::pubkey::Pubkey {
    ID
}
/// Const version of `ID`
pub const fn id_const() -> anchor_lang::solana_program::pubkey::Pubkey {
    ID_CONST
}
use anchor_lang::prelude::*;
pub mod bridge {
    pub mod cpi {
        pub mod ntt_manager {
            use anchor_lang::prelude::*;
            use anchor_lang::solana_program;
            use anchor_lang::solana_program::instruction::Instruction;
            pub const WORMHOLE_PROGRAM_ID: Pubkey = Pubkey::from_str_const(
                "BhnQyKoQQgpuRTRo6D8Emz93PvXCYfVgHhnrR4T3qhw4",
            );
            pub const TRANSFER_BURN_DISCRIMINATOR: [u8; 8] = [
                75,
                144,
                26,
                232,
                39,
                12,
                75,
                222,
            ];
            pub const RELEASE_WORMHOLE_OUTBOUND_DISCRIMINATOR: [u8; 8] = [
                202,
                87,
                51,
                173,
                142,
                160,
                188,
                204,
            ];
            pub const SESSION_AUTHORITY_SEED: &[u8] = b"session_authority";
            pub struct ChainId {
                pub id: u16,
            }
            impl borsh::ser::BorshSerialize for ChainId
            where
                u16: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.id, writer)?;
                    Ok(())
                }
            }
            impl borsh::de::BorshDeserialize for ChainId
            where
                u16: borsh::BorshDeserialize,
            {
                fn deserialize_reader<R: borsh::maybestd::io::Read>(
                    reader: &mut R,
                ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                    Ok(Self {
                        id: borsh::BorshDeserialize::deserialize_reader(reader)?,
                    })
                }
            }
            #[automatically_derived]
            impl ::core::clone::Clone for ChainId {
                #[inline]
                fn clone(&self) -> ChainId {
                    ChainId {
                        id: ::core::clone::Clone::clone(&self.id),
                    }
                }
            }
            #[automatically_derived]
            impl ::core::fmt::Debug for ChainId {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::debug_struct_field1_finish(
                        f,
                        "ChainId",
                        "id",
                        &&self.id,
                    )
                }
            }
            pub struct TransferArgs {
                pub amount: u64,
                pub recipient_chain: ChainId,
                pub recipient_address: [u8; 32],
                pub should_queue: bool,
            }
            impl borsh::ser::BorshSerialize for TransferArgs
            where
                u64: borsh::ser::BorshSerialize,
                ChainId: borsh::ser::BorshSerialize,
                [u8; 32]: borsh::ser::BorshSerialize,
                bool: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.amount, writer)?;
                    borsh::BorshSerialize::serialize(&self.recipient_chain, writer)?;
                    borsh::BorshSerialize::serialize(&self.recipient_address, writer)?;
                    borsh::BorshSerialize::serialize(&self.should_queue, writer)?;
                    Ok(())
                }
            }
            impl borsh::de::BorshDeserialize for TransferArgs
            where
                u64: borsh::BorshDeserialize,
                ChainId: borsh::BorshDeserialize,
                [u8; 32]: borsh::BorshDeserialize,
                bool: borsh::BorshDeserialize,
            {
                fn deserialize_reader<R: borsh::maybestd::io::Read>(
                    reader: &mut R,
                ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                    Ok(Self {
                        amount: borsh::BorshDeserialize::deserialize_reader(reader)?,
                        recipient_chain: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                        recipient_address: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                        should_queue: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                    })
                }
            }
            #[automatically_derived]
            impl ::core::clone::Clone for TransferArgs {
                #[inline]
                fn clone(&self) -> TransferArgs {
                    TransferArgs {
                        amount: ::core::clone::Clone::clone(&self.amount),
                        recipient_chain: ::core::clone::Clone::clone(
                            &self.recipient_chain,
                        ),
                        recipient_address: ::core::clone::Clone::clone(
                            &self.recipient_address,
                        ),
                        should_queue: ::core::clone::Clone::clone(&self.should_queue),
                    }
                }
            }
            #[automatically_derived]
            impl ::core::fmt::Debug for TransferArgs {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::debug_struct_field4_finish(
                        f,
                        "TransferArgs",
                        "amount",
                        &self.amount,
                        "recipient_chain",
                        &self.recipient_chain,
                        "recipient_address",
                        &self.recipient_address,
                        "should_queue",
                        &&self.should_queue,
                    )
                }
            }
            impl TransferArgs {
                pub fn keccak256(&self) -> solana_program::keccak::Hash {
                    let TransferArgs {
                        amount,
                        recipient_chain,
                        recipient_address,
                        should_queue,
                    } = self;
                    solana_program::keccak::hashv(
                        &[
                            amount.to_be_bytes().as_ref(),
                            recipient_chain.id.to_be_bytes().as_ref(),
                            recipient_address,
                            &[u8::from(*should_queue)],
                        ],
                    )
                }
            }
            pub struct ReleaseOutboundArgs {
                pub revert_on_delay: bool,
            }
            impl borsh::ser::BorshSerialize for ReleaseOutboundArgs
            where
                bool: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.revert_on_delay, writer)?;
                    Ok(())
                }
            }
            impl borsh::de::BorshDeserialize for ReleaseOutboundArgs
            where
                bool: borsh::BorshDeserialize,
            {
                fn deserialize_reader<R: borsh::maybestd::io::Read>(
                    reader: &mut R,
                ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                    Ok(Self {
                        revert_on_delay: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                    })
                }
            }
            #[automatically_derived]
            impl ::core::clone::Clone for ReleaseOutboundArgs {
                #[inline]
                fn clone(&self) -> ReleaseOutboundArgs {
                    ReleaseOutboundArgs {
                        revert_on_delay: ::core::clone::Clone::clone(
                            &self.revert_on_delay,
                        ),
                    }
                }
            }
            #[automatically_derived]
            impl ::core::fmt::Debug for ReleaseOutboundArgs {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::debug_struct_field1_finish(
                        f,
                        "ReleaseOutboundArgs",
                        "revert_on_delay",
                        &&self.revert_on_delay,
                    )
                }
            }
            pub struct TransferBurn<'info> {
                /// CHECK: unneeded for CPI
                pub payer: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub config: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub mint: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub from: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub token_program: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub outbox_item: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub outbox_rate_limit: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub custody: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub system_program: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub inbox_rate_limit: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub peer: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub session_authority: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub token_authority: AccountInfo<'info>,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::Accounts<'info, TransferBurnBumps>
            for TransferBurn<'info>
            where
                'info: 'info,
            {
                #[inline(never)]
                fn try_accounts(
                    __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                    __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >],
                    __ix_data: &[u8],
                    __bumps: &mut TransferBurnBumps,
                    __reallocs: &mut std::collections::BTreeSet<
                        anchor_lang::solana_program::pubkey::Pubkey,
                    >,
                ) -> anchor_lang::Result<Self> {
                    let payer: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("payer"))?;
                    let config: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("config"))?;
                    let mint: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("mint"))?;
                    let from: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("from"))?;
                    let token_program: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("token_program"))?;
                    let outbox_item: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("outbox_item"))?;
                    let outbox_rate_limit: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("outbox_rate_limit"))?;
                    let custody: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("custody"))?;
                    let system_program: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("system_program"))?;
                    let inbox_rate_limit: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("inbox_rate_limit"))?;
                    let peer: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("peer"))?;
                    let session_authority: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("session_authority"))?;
                    let token_authority: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("token_authority"))?;
                    Ok(TransferBurn {
                        payer,
                        config,
                        mint,
                        from,
                        token_program,
                        outbox_item,
                        outbox_rate_limit,
                        custody,
                        system_program,
                        inbox_rate_limit,
                        peer,
                        session_authority,
                        token_authority,
                    })
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for TransferBurn<'info>
            where
                'info: 'info,
            {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos.extend(self.payer.to_account_infos());
                    account_infos.extend(self.config.to_account_infos());
                    account_infos.extend(self.mint.to_account_infos());
                    account_infos.extend(self.from.to_account_infos());
                    account_infos.extend(self.token_program.to_account_infos());
                    account_infos.extend(self.outbox_item.to_account_infos());
                    account_infos.extend(self.outbox_rate_limit.to_account_infos());
                    account_infos.extend(self.custody.to_account_infos());
                    account_infos.extend(self.system_program.to_account_infos());
                    account_infos.extend(self.inbox_rate_limit.to_account_infos());
                    account_infos.extend(self.peer.to_account_infos());
                    account_infos.extend(self.session_authority.to_account_infos());
                    account_infos.extend(self.token_authority.to_account_infos());
                    account_infos
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for TransferBurn<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas.extend(self.payer.to_account_metas(None));
                    account_metas.extend(self.config.to_account_metas(None));
                    account_metas.extend(self.mint.to_account_metas(None));
                    account_metas.extend(self.from.to_account_metas(None));
                    account_metas.extend(self.token_program.to_account_metas(None));
                    account_metas.extend(self.outbox_item.to_account_metas(None));
                    account_metas.extend(self.outbox_rate_limit.to_account_metas(None));
                    account_metas.extend(self.custody.to_account_metas(None));
                    account_metas.extend(self.system_program.to_account_metas(None));
                    account_metas.extend(self.inbox_rate_limit.to_account_metas(None));
                    account_metas.extend(self.peer.to_account_metas(None));
                    account_metas.extend(self.session_authority.to_account_metas(None));
                    account_metas.extend(self.token_authority.to_account_metas(None));
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::AccountsExit<'info> for TransferBurn<'info>
            where
                'info: 'info,
            {
                fn exit(
                    &self,
                    program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                ) -> anchor_lang::Result<()> {
                    Ok(())
                }
            }
            pub struct TransferBurnBumps {}
            #[automatically_derived]
            impl ::core::fmt::Debug for TransferBurnBumps {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::write_str(f, "TransferBurnBumps")
                }
            }
            impl Default for TransferBurnBumps {
                fn default() -> Self {
                    TransferBurnBumps {}
                }
            }
            impl<'info> anchor_lang::Bumps for TransferBurn<'info>
            where
                'info: 'info,
            {
                type Bumps = TransferBurnBumps;
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
            /// instead of an `AccountInfo`. This is useful for clients that want
            /// to generate a list of accounts, without explicitly knowing the
            /// order all the fields should be in.
            ///
            /// To access the struct in this module, one should use the sibling
            /// `accounts` module (also generated), which re-exports this.
            pub(crate) mod __client_accounts_transfer_burn {
                use super::*;
                use anchor_lang::prelude::borsh;
                /// Generated client accounts for [`TransferBurn`].
                pub struct TransferBurn {
                    pub payer: Pubkey,
                    pub config: Pubkey,
                    pub mint: Pubkey,
                    pub from: Pubkey,
                    pub token_program: Pubkey,
                    pub outbox_item: Pubkey,
                    pub outbox_rate_limit: Pubkey,
                    pub custody: Pubkey,
                    pub system_program: Pubkey,
                    pub inbox_rate_limit: Pubkey,
                    pub peer: Pubkey,
                    pub session_authority: Pubkey,
                    pub token_authority: Pubkey,
                }
                impl borsh::ser::BorshSerialize for TransferBurn
                where
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                {
                    fn serialize<W: borsh::maybestd::io::Write>(
                        &self,
                        writer: &mut W,
                    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                        borsh::BorshSerialize::serialize(&self.payer, writer)?;
                        borsh::BorshSerialize::serialize(&self.config, writer)?;
                        borsh::BorshSerialize::serialize(&self.mint, writer)?;
                        borsh::BorshSerialize::serialize(&self.from, writer)?;
                        borsh::BorshSerialize::serialize(&self.token_program, writer)?;
                        borsh::BorshSerialize::serialize(&self.outbox_item, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.outbox_rate_limit,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.custody, writer)?;
                        borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.inbox_rate_limit,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.peer, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.session_authority,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.token_authority, writer)?;
                        Ok(())
                    }
                }
                #[automatically_derived]
                impl anchor_lang::ToAccountMetas for TransferBurn {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.payer,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.config,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.mint,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.from,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.token_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.outbox_item,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.outbox_rate_limit,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.custody,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.system_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.inbox_rate_limit,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.peer,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.session_authority,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.token_authority,
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a CPI struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is an
            /// AccountInfo.
            ///
            /// To access the struct in this module, one should use the sibling
            /// [`cpi::accounts`] module (also generated), which re-exports this.
            pub(crate) mod __cpi_client_accounts_transfer_burn {
                use super::*;
                /// Generated CPI struct of the accounts for [`TransferBurn`].
                pub struct TransferBurn<'info> {
                    pub payer: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub config: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub mint: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub from: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub outbox_item: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub outbox_rate_limit: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub custody: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub inbox_rate_limit: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub peer: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub session_authority: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub token_authority: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountMetas for TransferBurn<'info> {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.payer),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.config),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.mint),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.from),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.token_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.outbox_item),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.outbox_rate_limit),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.custody),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.system_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.inbox_rate_limit),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.peer),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.session_authority),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.token_authority),
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountInfos<'info> for TransferBurn<'info> {
                    fn to_account_infos(
                        &self,
                    ) -> Vec<
                        anchor_lang::solana_program::account_info::AccountInfo<'info>,
                    > {
                        let mut account_infos = ::alloc::vec::Vec::new();
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.payer),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.config),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.mint),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.from),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.token_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.outbox_item,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.outbox_rate_limit,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.custody),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.system_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.inbox_rate_limit,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.peer),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.session_authority,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.token_authority,
                                ),
                            );
                        account_infos
                    }
                }
            }
            pub struct ReleaseWormholeOutbound<'info> {
                /// CHECK: unneeded for CPI
                pub payer: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub config: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub outbox_item: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub transceiver: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub wormhole_message: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub emitter: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub wormhole_bridge: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub wormhole_fee_collector: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub wormhole_sequence: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub wormhole_program: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub system_program: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub clock: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub rent: AccountInfo<'info>,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::Accounts<'info, ReleaseWormholeOutboundBumps>
            for ReleaseWormholeOutbound<'info>
            where
                'info: 'info,
            {
                #[inline(never)]
                fn try_accounts(
                    __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                    __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >],
                    __ix_data: &[u8],
                    __bumps: &mut ReleaseWormholeOutboundBumps,
                    __reallocs: &mut std::collections::BTreeSet<
                        anchor_lang::solana_program::pubkey::Pubkey,
                    >,
                ) -> anchor_lang::Result<Self> {
                    let payer: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("payer"))?;
                    let config: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("config"))?;
                    let outbox_item: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("outbox_item"))?;
                    let transceiver: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("transceiver"))?;
                    let wormhole_message: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("wormhole_message"))?;
                    let emitter: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("emitter"))?;
                    let wormhole_bridge: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("wormhole_bridge"))?;
                    let wormhole_fee_collector: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("wormhole_fee_collector"))?;
                    let wormhole_sequence: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("wormhole_sequence"))?;
                    let wormhole_program: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("wormhole_program"))?;
                    let system_program: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("system_program"))?;
                    let clock: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("clock"))?;
                    let rent: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("rent"))?;
                    Ok(ReleaseWormholeOutbound {
                        payer,
                        config,
                        outbox_item,
                        transceiver,
                        wormhole_message,
                        emitter,
                        wormhole_bridge,
                        wormhole_fee_collector,
                        wormhole_sequence,
                        wormhole_program,
                        system_program,
                        clock,
                        rent,
                    })
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info>
            for ReleaseWormholeOutbound<'info>
            where
                'info: 'info,
            {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos.extend(self.payer.to_account_infos());
                    account_infos.extend(self.config.to_account_infos());
                    account_infos.extend(self.outbox_item.to_account_infos());
                    account_infos.extend(self.transceiver.to_account_infos());
                    account_infos.extend(self.wormhole_message.to_account_infos());
                    account_infos.extend(self.emitter.to_account_infos());
                    account_infos.extend(self.wormhole_bridge.to_account_infos());
                    account_infos.extend(self.wormhole_fee_collector.to_account_infos());
                    account_infos.extend(self.wormhole_sequence.to_account_infos());
                    account_infos.extend(self.wormhole_program.to_account_infos());
                    account_infos.extend(self.system_program.to_account_infos());
                    account_infos.extend(self.clock.to_account_infos());
                    account_infos.extend(self.rent.to_account_infos());
                    account_infos
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for ReleaseWormholeOutbound<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas.extend(self.payer.to_account_metas(None));
                    account_metas.extend(self.config.to_account_metas(None));
                    account_metas.extend(self.outbox_item.to_account_metas(None));
                    account_metas.extend(self.transceiver.to_account_metas(None));
                    account_metas.extend(self.wormhole_message.to_account_metas(None));
                    account_metas.extend(self.emitter.to_account_metas(None));
                    account_metas.extend(self.wormhole_bridge.to_account_metas(None));
                    account_metas
                        .extend(self.wormhole_fee_collector.to_account_metas(None));
                    account_metas.extend(self.wormhole_sequence.to_account_metas(None));
                    account_metas.extend(self.wormhole_program.to_account_metas(None));
                    account_metas.extend(self.system_program.to_account_metas(None));
                    account_metas.extend(self.clock.to_account_metas(None));
                    account_metas.extend(self.rent.to_account_metas(None));
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::AccountsExit<'info>
            for ReleaseWormholeOutbound<'info>
            where
                'info: 'info,
            {
                fn exit(
                    &self,
                    program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                ) -> anchor_lang::Result<()> {
                    Ok(())
                }
            }
            pub struct ReleaseWormholeOutboundBumps {}
            #[automatically_derived]
            impl ::core::fmt::Debug for ReleaseWormholeOutboundBumps {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::write_str(f, "ReleaseWormholeOutboundBumps")
                }
            }
            impl Default for ReleaseWormholeOutboundBumps {
                fn default() -> Self {
                    ReleaseWormholeOutboundBumps {}
                }
            }
            impl<'info> anchor_lang::Bumps for ReleaseWormholeOutbound<'info>
            where
                'info: 'info,
            {
                type Bumps = ReleaseWormholeOutboundBumps;
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
            /// instead of an `AccountInfo`. This is useful for clients that want
            /// to generate a list of accounts, without explicitly knowing the
            /// order all the fields should be in.
            ///
            /// To access the struct in this module, one should use the sibling
            /// `accounts` module (also generated), which re-exports this.
            pub(crate) mod __client_accounts_release_wormhole_outbound {
                use super::*;
                use anchor_lang::prelude::borsh;
                /// Generated client accounts for [`ReleaseWormholeOutbound`].
                pub struct ReleaseWormholeOutbound {
                    pub payer: Pubkey,
                    pub config: Pubkey,
                    pub outbox_item: Pubkey,
                    pub transceiver: Pubkey,
                    pub wormhole_message: Pubkey,
                    pub emitter: Pubkey,
                    pub wormhole_bridge: Pubkey,
                    pub wormhole_fee_collector: Pubkey,
                    pub wormhole_sequence: Pubkey,
                    pub wormhole_program: Pubkey,
                    pub system_program: Pubkey,
                    pub clock: Pubkey,
                    pub rent: Pubkey,
                }
                impl borsh::ser::BorshSerialize for ReleaseWormholeOutbound
                where
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                {
                    fn serialize<W: borsh::maybestd::io::Write>(
                        &self,
                        writer: &mut W,
                    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                        borsh::BorshSerialize::serialize(&self.payer, writer)?;
                        borsh::BorshSerialize::serialize(&self.config, writer)?;
                        borsh::BorshSerialize::serialize(&self.outbox_item, writer)?;
                        borsh::BorshSerialize::serialize(&self.transceiver, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.wormhole_message,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.emitter, writer)?;
                        borsh::BorshSerialize::serialize(&self.wormhole_bridge, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.wormhole_fee_collector,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.wormhole_sequence,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.wormhole_program,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                        borsh::BorshSerialize::serialize(&self.clock, writer)?;
                        borsh::BorshSerialize::serialize(&self.rent, writer)?;
                        Ok(())
                    }
                }
                #[automatically_derived]
                impl anchor_lang::ToAccountMetas for ReleaseWormholeOutbound {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.payer,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.config,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.outbox_item,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.transceiver,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.wormhole_message,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.emitter,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.wormhole_bridge,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.wormhole_fee_collector,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.wormhole_sequence,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.wormhole_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.system_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.clock,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.rent,
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a CPI struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is an
            /// AccountInfo.
            ///
            /// To access the struct in this module, one should use the sibling
            /// [`cpi::accounts`] module (also generated), which re-exports this.
            pub(crate) mod __cpi_client_accounts_release_wormhole_outbound {
                use super::*;
                /// Generated CPI struct of the accounts for [`ReleaseWormholeOutbound`].
                pub struct ReleaseWormholeOutbound<'info> {
                    pub payer: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub config: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub outbox_item: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub transceiver: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub wormhole_message: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub emitter: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub wormhole_bridge: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub wormhole_fee_collector: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub wormhole_sequence: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub wormhole_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub clock: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub rent: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountMetas
                for ReleaseWormholeOutbound<'info> {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.payer),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.config),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.outbox_item),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.transceiver),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.wormhole_message),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.emitter),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.wormhole_bridge),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.wormhole_fee_collector),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.wormhole_sequence),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.wormhole_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.system_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.clock),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.rent),
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountInfos<'info>
                for ReleaseWormholeOutbound<'info> {
                    fn to_account_infos(
                        &self,
                    ) -> Vec<
                        anchor_lang::solana_program::account_info::AccountInfo<'info>,
                    > {
                        let mut account_infos = ::alloc::vec::Vec::new();
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.payer),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.config),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.outbox_item,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.transceiver,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.wormhole_message,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.emitter),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.wormhole_bridge,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.wormhole_fee_collector,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.wormhole_sequence,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.wormhole_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.system_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.clock),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.rent),
                            );
                        account_infos
                    }
                }
            }
            pub fn transfer_burn<'info>(
                ctx: CpiContext<'_, '_, '_, 'info, TransferBurn<'info>>,
                args: TransferArgs,
                program_id: Pubkey,
            ) -> Result<()> {
                let accounts = ctx.accounts;
                let account_metas = <[_]>::into_vec(
                    ::alloc::boxed::box_new([
                        AccountMeta::new(*accounts.payer.key, true),
                        AccountMeta::new_readonly(*accounts.config.key, false),
                        AccountMeta::new(*accounts.mint.key, false),
                        AccountMeta::new(*accounts.from.key, false),
                        AccountMeta::new_readonly(*accounts.token_program.key, false),
                        AccountMeta::new(*accounts.outbox_item.key, true),
                        AccountMeta::new(*accounts.outbox_rate_limit.key, false),
                        AccountMeta::new(*accounts.custody.key, false),
                        AccountMeta::new_readonly(*accounts.system_program.key, false),
                        AccountMeta::new(*accounts.inbox_rate_limit.key, false),
                        AccountMeta::new_readonly(*accounts.peer.key, false),
                        AccountMeta::new_readonly(
                            *accounts.session_authority.key,
                            false,
                        ),
                        AccountMeta::new_readonly(*accounts.token_authority.key, false),
                    ]),
                );
                let mut data = Vec::new();
                data.extend_from_slice(&TRANSFER_BURN_DISCRIMINATOR);
                args.serialize(&mut data)?;
                let instruction = Instruction {
                    program_id,
                    accounts: account_metas,
                    data,
                };
                let account_infos = &[
                    accounts.payer,
                    accounts.config,
                    accounts.mint,
                    accounts.from,
                    accounts.token_program,
                    accounts.outbox_item,
                    accounts.outbox_rate_limit,
                    accounts.custody,
                    accounts.system_program,
                    accounts.inbox_rate_limit,
                    accounts.peer,
                    accounts.session_authority,
                    accounts.token_authority,
                ];
                solana_program::program::invoke_signed(
                        &instruction,
                        account_infos,
                        ctx.signer_seeds,
                    )
                    .map_err(Into::into)
            }
            pub fn release_wormhole_outbound<'info>(
                ctx: CpiContext<'_, '_, '_, 'info, ReleaseWormholeOutbound<'info>>,
                args: ReleaseOutboundArgs,
                program_id: Pubkey,
            ) -> Result<()> {
                let accounts = ctx.accounts;
                let account_metas = <[_]>::into_vec(
                    ::alloc::boxed::box_new([
                        AccountMeta::new(*accounts.payer.key, true),
                        AccountMeta::new_readonly(*accounts.config.key, false),
                        AccountMeta::new(*accounts.outbox_item.key, false),
                        AccountMeta::new_readonly(*accounts.transceiver.key, false),
                        AccountMeta::new(*accounts.wormhole_message.key, false),
                        AccountMeta::new_readonly(*accounts.emitter.key, false),
                        AccountMeta::new(*accounts.wormhole_bridge.key, false),
                        AccountMeta::new(*accounts.wormhole_fee_collector.key, false),
                        AccountMeta::new(*accounts.wormhole_sequence.key, false),
                        AccountMeta::new_readonly(*accounts.wormhole_program.key, false),
                        AccountMeta::new_readonly(*accounts.system_program.key, false),
                        AccountMeta::new_readonly(*accounts.clock.key, false),
                        AccountMeta::new_readonly(*accounts.rent.key, false),
                    ]),
                );
                let mut data = Vec::new();
                data.extend_from_slice(&RELEASE_WORMHOLE_OUTBOUND_DISCRIMINATOR);
                args.serialize(&mut data)?;
                let instruction = Instruction {
                    program_id,
                    accounts: account_metas,
                    data,
                };
                let account_infos = &[
                    accounts.payer,
                    accounts.config,
                    accounts.outbox_item,
                    accounts.transceiver,
                    accounts.wormhole_message,
                    accounts.emitter,
                    accounts.wormhole_bridge,
                    accounts.wormhole_fee_collector,
                    accounts.wormhole_sequence,
                    accounts.wormhole_program,
                    accounts.system_program,
                    accounts.clock,
                    accounts.rent,
                ];
                solana_program::program::invoke_signed(
                        &instruction,
                        account_infos,
                        ctx.signer_seeds,
                    )
                    .map_err(Into::into)
            }
        }
        pub mod ntt_with_executor {
            use anchor_lang::prelude::*;
            use anchor_lang::solana_program;
            use anchor_lang::solana_program::instruction::Instruction;
            pub const NTT_WITH_EXECUTOR_PROGRAM_ID: Pubkey = Pubkey::from_str_const(
                "nex1gkSWtRBheEJuQZMqHhbMG5A45qPU76KqnCZNVHR",
            );
            pub const EXECUTOR_PROGRAM_ID: Pubkey = Pubkey::from_str_const(
                "execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV",
            );
            pub const RELAY_NTT_MESSAGE_DISCRIMINATOR: [u8; 8] = [
                192,
                85,
                112,
                237,
                55,
                33,
                49,
                150,
            ];
            pub struct RelayNttMessageArgs {
                pub recipient_chain: u16,
                pub exec_amount: u64,
                pub signed_quote_bytes: Vec<u8>,
                pub relay_instructions: Vec<u8>,
            }
            impl borsh::ser::BorshSerialize for RelayNttMessageArgs
            where
                u16: borsh::ser::BorshSerialize,
                u64: borsh::ser::BorshSerialize,
                Vec<u8>: borsh::ser::BorshSerialize,
                Vec<u8>: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.recipient_chain, writer)?;
                    borsh::BorshSerialize::serialize(&self.exec_amount, writer)?;
                    borsh::BorshSerialize::serialize(&self.signed_quote_bytes, writer)?;
                    borsh::BorshSerialize::serialize(&self.relay_instructions, writer)?;
                    Ok(())
                }
            }
            impl borsh::de::BorshDeserialize for RelayNttMessageArgs
            where
                u16: borsh::BorshDeserialize,
                u64: borsh::BorshDeserialize,
                Vec<u8>: borsh::BorshDeserialize,
                Vec<u8>: borsh::BorshDeserialize,
            {
                fn deserialize_reader<R: borsh::maybestd::io::Read>(
                    reader: &mut R,
                ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                    Ok(Self {
                        recipient_chain: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                        exec_amount: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                        signed_quote_bytes: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                        relay_instructions: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                    })
                }
            }
            #[automatically_derived]
            impl ::core::clone::Clone for RelayNttMessageArgs {
                #[inline]
                fn clone(&self) -> RelayNttMessageArgs {
                    RelayNttMessageArgs {
                        recipient_chain: ::core::clone::Clone::clone(
                            &self.recipient_chain,
                        ),
                        exec_amount: ::core::clone::Clone::clone(&self.exec_amount),
                        signed_quote_bytes: ::core::clone::Clone::clone(
                            &self.signed_quote_bytes,
                        ),
                        relay_instructions: ::core::clone::Clone::clone(
                            &self.relay_instructions,
                        ),
                    }
                }
            }
            #[automatically_derived]
            impl ::core::fmt::Debug for RelayNttMessageArgs {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::debug_struct_field4_finish(
                        f,
                        "RelayNttMessageArgs",
                        "recipient_chain",
                        &self.recipient_chain,
                        "exec_amount",
                        &self.exec_amount,
                        "signed_quote_bytes",
                        &self.signed_quote_bytes,
                        "relay_instructions",
                        &&self.relay_instructions,
                    )
                }
            }
            pub struct RelayNttMessage<'info> {
                /// CHECK: unneeded for CPI
                pub payer: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub payee: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub ntt_program_id: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub ntt_peer: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub ntt_message: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub executor_program: AccountInfo<'info>,
                /// CHECK: unneeded for CPI
                pub system_program: AccountInfo<'info>,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::Accounts<'info, RelayNttMessageBumps>
            for RelayNttMessage<'info>
            where
                'info: 'info,
            {
                #[inline(never)]
                fn try_accounts(
                    __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                    __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >],
                    __ix_data: &[u8],
                    __bumps: &mut RelayNttMessageBumps,
                    __reallocs: &mut std::collections::BTreeSet<
                        anchor_lang::solana_program::pubkey::Pubkey,
                    >,
                ) -> anchor_lang::Result<Self> {
                    let payer: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("payer"))?;
                    let payee: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("payee"))?;
                    let ntt_program_id: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_program_id"))?;
                    let ntt_peer: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_peer"))?;
                    let ntt_message: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_message"))?;
                    let executor_program: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("executor_program"))?;
                    let system_program: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("system_program"))?;
                    Ok(RelayNttMessage {
                        payer,
                        payee,
                        ntt_program_id,
                        ntt_peer,
                        ntt_message,
                        executor_program,
                        system_program,
                    })
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for RelayNttMessage<'info>
            where
                'info: 'info,
            {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos.extend(self.payer.to_account_infos());
                    account_infos.extend(self.payee.to_account_infos());
                    account_infos.extend(self.ntt_program_id.to_account_infos());
                    account_infos.extend(self.ntt_peer.to_account_infos());
                    account_infos.extend(self.ntt_message.to_account_infos());
                    account_infos.extend(self.executor_program.to_account_infos());
                    account_infos.extend(self.system_program.to_account_infos());
                    account_infos
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for RelayNttMessage<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas.extend(self.payer.to_account_metas(None));
                    account_metas.extend(self.payee.to_account_metas(None));
                    account_metas.extend(self.ntt_program_id.to_account_metas(None));
                    account_metas.extend(self.ntt_peer.to_account_metas(None));
                    account_metas.extend(self.ntt_message.to_account_metas(None));
                    account_metas.extend(self.executor_program.to_account_metas(None));
                    account_metas.extend(self.system_program.to_account_metas(None));
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::AccountsExit<'info> for RelayNttMessage<'info>
            where
                'info: 'info,
            {
                fn exit(
                    &self,
                    program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                ) -> anchor_lang::Result<()> {
                    Ok(())
                }
            }
            pub struct RelayNttMessageBumps {}
            #[automatically_derived]
            impl ::core::fmt::Debug for RelayNttMessageBumps {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::write_str(f, "RelayNttMessageBumps")
                }
            }
            impl Default for RelayNttMessageBumps {
                fn default() -> Self {
                    RelayNttMessageBumps {}
                }
            }
            impl<'info> anchor_lang::Bumps for RelayNttMessage<'info>
            where
                'info: 'info,
            {
                type Bumps = RelayNttMessageBumps;
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
            /// instead of an `AccountInfo`. This is useful for clients that want
            /// to generate a list of accounts, without explicitly knowing the
            /// order all the fields should be in.
            ///
            /// To access the struct in this module, one should use the sibling
            /// `accounts` module (also generated), which re-exports this.
            pub(crate) mod __client_accounts_relay_ntt_message {
                use super::*;
                use anchor_lang::prelude::borsh;
                /// Generated client accounts for [`RelayNttMessage`].
                pub struct RelayNttMessage {
                    pub payer: Pubkey,
                    pub payee: Pubkey,
                    pub ntt_program_id: Pubkey,
                    pub ntt_peer: Pubkey,
                    pub ntt_message: Pubkey,
                    pub executor_program: Pubkey,
                    pub system_program: Pubkey,
                }
                impl borsh::ser::BorshSerialize for RelayNttMessage
                where
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                {
                    fn serialize<W: borsh::maybestd::io::Write>(
                        &self,
                        writer: &mut W,
                    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                        borsh::BorshSerialize::serialize(&self.payer, writer)?;
                        borsh::BorshSerialize::serialize(&self.payee, writer)?;
                        borsh::BorshSerialize::serialize(&self.ntt_program_id, writer)?;
                        borsh::BorshSerialize::serialize(&self.ntt_peer, writer)?;
                        borsh::BorshSerialize::serialize(&self.ntt_message, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.executor_program,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                        Ok(())
                    }
                }
                #[automatically_derived]
                impl anchor_lang::ToAccountMetas for RelayNttMessage {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.payer,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.payee,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.ntt_program_id,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.ntt_peer,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.ntt_message,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.executor_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.system_program,
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a CPI struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is an
            /// AccountInfo.
            ///
            /// To access the struct in this module, one should use the sibling
            /// [`cpi::accounts`] module (also generated), which re-exports this.
            pub(crate) mod __cpi_client_accounts_relay_ntt_message {
                use super::*;
                /// Generated CPI struct of the accounts for [`RelayNttMessage`].
                pub struct RelayNttMessage<'info> {
                    pub payer: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub payee: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_program_id: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_peer: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_message: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub executor_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountMetas for RelayNttMessage<'info> {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.payer),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.payee),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.ntt_program_id),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.ntt_peer),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.ntt_message),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.executor_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.system_program),
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountInfos<'info>
                for RelayNttMessage<'info> {
                    fn to_account_infos(
                        &self,
                    ) -> Vec<
                        anchor_lang::solana_program::account_info::AccountInfo<'info>,
                    > {
                        let mut account_infos = ::alloc::vec::Vec::new();
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.payer),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.payee),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_program_id,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_peer,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_message,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.executor_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.system_program,
                                ),
                            );
                        account_infos
                    }
                }
            }
            pub fn relay_ntt_message<'info>(
                ctx: CpiContext<'_, '_, '_, 'info, RelayNttMessage<'info>>,
                args: RelayNttMessageArgs,
            ) -> Result<()> {
                let accounts = ctx.accounts;
                let account_metas = <[_]>::into_vec(
                    ::alloc::boxed::box_new([
                        AccountMeta::new(*accounts.payer.key, true),
                        AccountMeta::new(*accounts.payee.key, false),
                        AccountMeta::new_readonly(*accounts.ntt_program_id.key, false),
                        AccountMeta::new_readonly(*accounts.ntt_peer.key, false),
                        AccountMeta::new_readonly(*accounts.ntt_message.key, false),
                        AccountMeta::new_readonly(*accounts.executor_program.key, false),
                        AccountMeta::new_readonly(*accounts.system_program.key, false),
                    ]),
                );
                let mut data = Vec::new();
                data.extend_from_slice(&RELAY_NTT_MESSAGE_DISCRIMINATOR);
                args.serialize(&mut data)?;
                let instruction = Instruction {
                    program_id: NTT_WITH_EXECUTOR_PROGRAM_ID,
                    accounts: account_metas,
                    data,
                };
                let account_infos = &[
                    accounts.payer,
                    accounts.payee,
                    accounts.ntt_program_id,
                    accounts.ntt_peer,
                    accounts.ntt_message,
                    accounts.executor_program,
                    accounts.system_program,
                ];
                solana_program::program::invoke_signed(
                        &instruction,
                        account_infos,
                        ctx.signer_seeds,
                    )
                    .map_err(Into::into)
            }
        }
    }
    pub mod message {
        use nom::{
            bytes::complete::tag, character::complete::line_ending,
            combinator::{eof, map, verify},
            error::{Error, ParseError},
            sequence::delimited, AsChar, Compare, Err, IResult, Input, Offset, ParseTo,
            Parser,
        };
        use solana_intents::{tag_key_value, SymbolOrMint, Version};
        const BRIDGE_MESSAGE_PREFIX: &str = "Fogo Bridge Transfer:\nSigning this intent will bridge out the tokens as described below.\n";
        pub enum BridgeMessage {
            Ntt(NttMessage),
        }
        #[automatically_derived]
        impl ::core::fmt::Debug for BridgeMessage {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                match self {
                    BridgeMessage::Ntt(__self_0) => {
                        ::core::fmt::Formatter::debug_tuple_field1_finish(
                            f,
                            "Ntt",
                            &__self_0,
                        )
                    }
                }
            }
        }
        #[automatically_derived]
        impl ::core::marker::StructuralPartialEq for BridgeMessage {}
        #[automatically_derived]
        impl ::core::cmp::PartialEq for BridgeMessage {
            #[inline]
            fn eq(&self, other: &BridgeMessage) -> bool {
                match (self, other) {
                    (BridgeMessage::Ntt(__self_0), BridgeMessage::Ntt(__arg1_0)) => {
                        __self_0 == __arg1_0
                    }
                }
            }
        }
        pub struct NttMessage {
            pub version: Version,
            pub from_chain_id: String,
            pub symbol_or_mint: SymbolOrMint,
            pub amount: String,
            pub to_chain_id: String,
            pub recipient_address: String,
            pub nonce: u64,
        }
        #[automatically_derived]
        impl ::core::fmt::Debug for NttMessage {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                let names: &'static _ = &[
                    "version",
                    "from_chain_id",
                    "symbol_or_mint",
                    "amount",
                    "to_chain_id",
                    "recipient_address",
                    "nonce",
                ];
                let values: &[&dyn ::core::fmt::Debug] = &[
                    &self.version,
                    &self.from_chain_id,
                    &self.symbol_or_mint,
                    &self.amount,
                    &self.to_chain_id,
                    &self.recipient_address,
                    &&self.nonce,
                ];
                ::core::fmt::Formatter::debug_struct_fields_finish(
                    f,
                    "NttMessage",
                    names,
                    values,
                )
            }
        }
        #[automatically_derived]
        impl ::core::marker::StructuralPartialEq for NttMessage {}
        #[automatically_derived]
        impl ::core::cmp::PartialEq for NttMessage {
            #[inline]
            fn eq(&self, other: &NttMessage) -> bool {
                self.version == other.version
                    && self.from_chain_id == other.from_chain_id
                    && self.symbol_or_mint == other.symbol_or_mint
                    && self.amount == other.amount
                    && self.to_chain_id == other.to_chain_id
                    && self.recipient_address == other.recipient_address
                    && self.nonce == other.nonce
            }
        }
        pub fn convert_chain_id_to_wormhole(chain_id: &str) -> Option<u16> {
            match chain_id {
                "solana" => Some(1),
                "ethereum" => Some(2),
                "fogo" => Some(51),
                "sepolia" => Some(10002),
                _ => None,
            }
        }
        impl TryFrom<Vec<u8>> for BridgeMessage {
            type Error = Err<Error<Vec<u8>>>;
            fn try_from(message: Vec<u8>) -> Result<Self, Self::Error> {
                match message_ntt.parse(message.as_slice()) {
                    Ok((_, message)) => Ok(BridgeMessage::Ntt(message)),
                    Err(e) => Err(Err::<Error<&[u8]>>::to_owned(e)),
                }
            }
        }
        fn message_ntt<I, E>(input: I) -> IResult<I, NttMessage, E>
        where
            I: Input,
            I: ParseTo<String>,
            I: ParseTo<SymbolOrMint>,
            I: ParseTo<Version>,
            I: ParseTo<u64>,
            I: ParseTo<u16>,
            I: Offset,
            I: for<'a> Compare<&'a str>,
            <I as Input>::Item: AsChar,
            E: ParseError<I>,
        {
            map(
                    delimited(
                        (tag(BRIDGE_MESSAGE_PREFIX), line_ending),
                        (
                            verify(
                                tag_key_value("version"),
                                |version: &Version| {
                                    version.major == 0 && version.minor == 1
                                },
                            ),
                            tag_key_value("from_chain_id"),
                            tag_key_value("to_chain_id"),
                            tag_key_value("token"),
                            tag_key_value("amount"),
                            tag_key_value("recipient_address"),
                            tag_key_value("nonce"),
                        ),
                        eof,
                    ),
                    |
                        (
                            version,
                            from_chain_id,
                            to_chain_id,
                            symbol_or_mint,
                            amount,
                            recipient_address,
                            nonce,
                        )|
                    NttMessage {
                        version,
                        from_chain_id,
                        to_chain_id,
                        symbol_or_mint,
                        amount,
                        recipient_address,
                        nonce,
                    },
                )
                .parse(input)
        }
    }
    pub mod processor {
        pub mod bridge_ntt_tokens {
            use crate::{
                bridge::{
                    cpi::{self, ntt_manager::WORMHOLE_PROGRAM_ID},
                    message::{convert_chain_id_to_wormhole, BridgeMessage, NttMessage},
                },
                config::state::ntt_config::{
                    verify_ntt_manager, ExpectedNttConfig, EXPECTED_NTT_CONFIG_SEED,
                },
                error::IntentTransferError, nonce::Nonce,
                verify::{
                    verify_and_update_nonce, verify_signer_matches_source,
                    verify_symbol_or_mint,
                },
                INTENT_TRANSFER_SEED,
            };
            use anchor_lang::{prelude::*, solana_program::sysvar::instructions};
            use anchor_spl::token::{
                approve, close_account, spl_token::try_ui_amount_into_amount,
                transfer_checked, Approve, CloseAccount, Mint, Token, TokenAccount,
                TransferChecked,
            };
            use chain_id::ChainId;
            use solana_intents::Intent;
            const BRIDGE_NTT_INTERMEDIATE_SEED: &[u8] = b"bridge_ntt_intermediate";
            const BRIDGE_NTT_NONCE_SEED: &[u8] = b"bridge_ntt_nonce";
            pub struct BridgeNttTokensArgs {
                pub exec_amount: u64,
                pub signed_quote_bytes: Vec<u8>,
                pub relay_instructions: Vec<u8>,
            }
            impl borsh::ser::BorshSerialize for BridgeNttTokensArgs
            where
                u64: borsh::ser::BorshSerialize,
                Vec<u8>: borsh::ser::BorshSerialize,
                Vec<u8>: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.exec_amount, writer)?;
                    borsh::BorshSerialize::serialize(&self.signed_quote_bytes, writer)?;
                    borsh::BorshSerialize::serialize(&self.relay_instructions, writer)?;
                    Ok(())
                }
            }
            impl borsh::de::BorshDeserialize for BridgeNttTokensArgs
            where
                u64: borsh::BorshDeserialize,
                Vec<u8>: borsh::BorshDeserialize,
                Vec<u8>: borsh::BorshDeserialize,
            {
                fn deserialize_reader<R: borsh::maybestd::io::Read>(
                    reader: &mut R,
                ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                    Ok(Self {
                        exec_amount: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                        signed_quote_bytes: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                        relay_instructions: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                    })
                }
            }
            #[automatically_derived]
            impl ::core::clone::Clone for BridgeNttTokensArgs {
                #[inline]
                fn clone(&self) -> BridgeNttTokensArgs {
                    BridgeNttTokensArgs {
                        exec_amount: ::core::clone::Clone::clone(&self.exec_amount),
                        signed_quote_bytes: ::core::clone::Clone::clone(
                            &self.signed_quote_bytes,
                        ),
                        relay_instructions: ::core::clone::Clone::clone(
                            &self.relay_instructions,
                        ),
                    }
                }
            }
            pub struct Ntt<'info> {
                /// CHECK: Clock sysvar
                pub clock: Sysvar<'info, Clock>,
                /// CHECK: Rent sysvar
                pub rent: Sysvar<'info, Rent>,
                /// CHECK: checked in NTT manager program
                pub ntt_manager: UncheckedAccount<'info>,
                /// CHECK: checked in NTT manager program
                pub ntt_config: UncheckedAccount<'info>,
                /// CHECK: checked in NTT manager program
                #[account(mut)]
                pub ntt_inbox_rate_limit: UncheckedAccount<'info>,
                /// CHECK: checked in NTT manager program
                pub ntt_session_authority: UncheckedAccount<'info>,
                /// CHECK: checked in NTT manager program
                pub ntt_token_authority: UncheckedAccount<'info>,
                /// CHECK: checked in NTT manager program
                #[account(mut)]
                pub wormhole_message: UncheckedAccount<'info>,
                /// CHECK: checked in NTT manager program
                pub transceiver: UncheckedAccount<'info>,
                /// CHECK: checked in NTT manager program
                pub emitter: UncheckedAccount<'info>,
                /// CHECK: checked in NTT manager program
                #[account(mut)]
                pub wormhole_bridge: UncheckedAccount<'info>,
                /// CHECK: checked in wormhole program
                #[account(mut)]
                pub wormhole_fee_collector: UncheckedAccount<'info>,
                /// CHECK: checked in wormhole program
                #[account(mut)]
                pub wormhole_sequence: UncheckedAccount<'info>,
                /// CHECK: address is checked, but also verified in NTT manager program
                #[account(address = WORMHOLE_PROGRAM_ID)]
                pub wormhole_program: UncheckedAccount<'info>,
                /// CHECK: address is checked
                #[account(
                    address = cpi::ntt_with_executor::NTT_WITH_EXECUTOR_PROGRAM_ID
                )]
                pub ntt_with_executor_program: UncheckedAccount<'info>,
                /// CHECK: address is checked
                #[account(address = cpi::ntt_with_executor::EXECUTOR_PROGRAM_ID)]
                pub executor_program: UncheckedAccount<'info>,
                /// CHECK: check not important per https://github.com/wormholelabs-xyz/example-ntt-with-executor-svm/blob/10c51da84ee5deb9dee7b2afa69382ce90984eae/programs/example-ntt-with-executor-svm/src/lib.rs#L74-L76
                pub ntt_peer: UncheckedAccount<'info>,
                /// CHECK: check not important per https://github.com/wormholelabs-xyz/example-ntt-with-executor-svm/blob/10c51da84ee5deb9dee7b2afa69382ce90984eae/programs/example-ntt-with-executor-svm/src/lib.rs#L78-L80
                #[account(mut)]
                pub ntt_outbox_item: Signer<'info>,
                /// CHECK: check not important per https://github.com/wormhole-foundation/native-token-transfers/blob/8bd672c5164c53d5a3f9403dc7ce3450da539450/solana/programs/example-native-token-transfers/src/queue/outbox.rs#L50
                #[account(mut)]
                pub ntt_outbox_rate_limit: UncheckedAccount<'info>,
                /// CHECK: checked in NTT manager program
                #[account(mut)]
                pub ntt_custody: UncheckedAccount<'info>,
                /// CHECK: checked in NTT with executor program
                #[account(mut)]
                pub payee_ntt_with_executor: UncheckedAccount<'info>,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::Accounts<'info, NttBumps> for Ntt<'info>
            where
                'info: 'info,
            {
                #[inline(never)]
                fn try_accounts(
                    __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                    __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >],
                    __ix_data: &[u8],
                    __bumps: &mut NttBumps,
                    __reallocs: &mut std::collections::BTreeSet<
                        anchor_lang::solana_program::pubkey::Pubkey,
                    >,
                ) -> anchor_lang::Result<Self> {
                    let clock: Sysvar<Clock> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("clock"))?;
                    let rent: Sysvar<Rent> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("rent"))?;
                    let ntt_manager: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_manager"))?;
                    let ntt_config: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_config"))?;
                    let ntt_inbox_rate_limit: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_inbox_rate_limit"))?;
                    let ntt_session_authority: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_session_authority"))?;
                    let ntt_token_authority: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_token_authority"))?;
                    let wormhole_message: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("wormhole_message"))?;
                    let transceiver: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("transceiver"))?;
                    let emitter: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("emitter"))?;
                    let wormhole_bridge: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("wormhole_bridge"))?;
                    let wormhole_fee_collector: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("wormhole_fee_collector"))?;
                    let wormhole_sequence: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("wormhole_sequence"))?;
                    let wormhole_program: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("wormhole_program"))?;
                    let ntt_with_executor_program: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_with_executor_program"))?;
                    let executor_program: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("executor_program"))?;
                    let ntt_peer: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_peer"))?;
                    let ntt_outbox_item: Signer = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_outbox_item"))?;
                    let ntt_outbox_rate_limit: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_outbox_rate_limit"))?;
                    let ntt_custody: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_custody"))?;
                    let payee_ntt_with_executor: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("payee_ntt_with_executor"))?;
                    if !AsRef::<AccountInfo>::as_ref(&ntt_inbox_rate_limit).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("ntt_inbox_rate_limit"),
                        );
                    }
                    if !AsRef::<AccountInfo>::as_ref(&wormhole_message).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("wormhole_message"),
                        );
                    }
                    if !AsRef::<AccountInfo>::as_ref(&wormhole_bridge).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("wormhole_bridge"),
                        );
                    }
                    if !AsRef::<AccountInfo>::as_ref(&wormhole_fee_collector).is_writable
                    {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("wormhole_fee_collector"),
                        );
                    }
                    if !AsRef::<AccountInfo>::as_ref(&wormhole_sequence).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("wormhole_sequence"),
                        );
                    }
                    {
                        let actual = wormhole_program.key();
                        let expected = WORMHOLE_PROGRAM_ID;
                        if actual != expected {
                            return Err(
                                anchor_lang::error::Error::from(
                                        anchor_lang::error::ErrorCode::ConstraintAddress,
                                    )
                                    .with_account_name("wormhole_program")
                                    .with_pubkeys((actual, expected)),
                            );
                        }
                    }
                    {
                        let actual = ntt_with_executor_program.key();
                        let expected = cpi::ntt_with_executor::NTT_WITH_EXECUTOR_PROGRAM_ID;
                        if actual != expected {
                            return Err(
                                anchor_lang::error::Error::from(
                                        anchor_lang::error::ErrorCode::ConstraintAddress,
                                    )
                                    .with_account_name("ntt_with_executor_program")
                                    .with_pubkeys((actual, expected)),
                            );
                        }
                    }
                    {
                        let actual = executor_program.key();
                        let expected = cpi::ntt_with_executor::EXECUTOR_PROGRAM_ID;
                        if actual != expected {
                            return Err(
                                anchor_lang::error::Error::from(
                                        anchor_lang::error::ErrorCode::ConstraintAddress,
                                    )
                                    .with_account_name("executor_program")
                                    .with_pubkeys((actual, expected)),
                            );
                        }
                    }
                    if !AsRef::<AccountInfo>::as_ref(&ntt_outbox_item).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("ntt_outbox_item"),
                        );
                    }
                    if !AsRef::<AccountInfo>::as_ref(&ntt_outbox_rate_limit).is_writable
                    {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("ntt_outbox_rate_limit"),
                        );
                    }
                    if !AsRef::<AccountInfo>::as_ref(&ntt_custody).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("ntt_custody"),
                        );
                    }
                    if !AsRef::<AccountInfo>::as_ref(&payee_ntt_with_executor)
                        .is_writable
                    {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("payee_ntt_with_executor"),
                        );
                    }
                    Ok(Ntt {
                        clock,
                        rent,
                        ntt_manager,
                        ntt_config,
                        ntt_inbox_rate_limit,
                        ntt_session_authority,
                        ntt_token_authority,
                        wormhole_message,
                        transceiver,
                        emitter,
                        wormhole_bridge,
                        wormhole_fee_collector,
                        wormhole_sequence,
                        wormhole_program,
                        ntt_with_executor_program,
                        executor_program,
                        ntt_peer,
                        ntt_outbox_item,
                        ntt_outbox_rate_limit,
                        ntt_custody,
                        payee_ntt_with_executor,
                    })
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for Ntt<'info>
            where
                'info: 'info,
            {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos.extend(self.clock.to_account_infos());
                    account_infos.extend(self.rent.to_account_infos());
                    account_infos.extend(self.ntt_manager.to_account_infos());
                    account_infos.extend(self.ntt_config.to_account_infos());
                    account_infos.extend(self.ntt_inbox_rate_limit.to_account_infos());
                    account_infos.extend(self.ntt_session_authority.to_account_infos());
                    account_infos.extend(self.ntt_token_authority.to_account_infos());
                    account_infos.extend(self.wormhole_message.to_account_infos());
                    account_infos.extend(self.transceiver.to_account_infos());
                    account_infos.extend(self.emitter.to_account_infos());
                    account_infos.extend(self.wormhole_bridge.to_account_infos());
                    account_infos.extend(self.wormhole_fee_collector.to_account_infos());
                    account_infos.extend(self.wormhole_sequence.to_account_infos());
                    account_infos.extend(self.wormhole_program.to_account_infos());
                    account_infos
                        .extend(self.ntt_with_executor_program.to_account_infos());
                    account_infos.extend(self.executor_program.to_account_infos());
                    account_infos.extend(self.ntt_peer.to_account_infos());
                    account_infos.extend(self.ntt_outbox_item.to_account_infos());
                    account_infos.extend(self.ntt_outbox_rate_limit.to_account_infos());
                    account_infos.extend(self.ntt_custody.to_account_infos());
                    account_infos
                        .extend(self.payee_ntt_with_executor.to_account_infos());
                    account_infos
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for Ntt<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas.extend(self.clock.to_account_metas(None));
                    account_metas.extend(self.rent.to_account_metas(None));
                    account_metas.extend(self.ntt_manager.to_account_metas(None));
                    account_metas.extend(self.ntt_config.to_account_metas(None));
                    account_metas
                        .extend(self.ntt_inbox_rate_limit.to_account_metas(None));
                    account_metas
                        .extend(self.ntt_session_authority.to_account_metas(None));
                    account_metas
                        .extend(self.ntt_token_authority.to_account_metas(None));
                    account_metas.extend(self.wormhole_message.to_account_metas(None));
                    account_metas.extend(self.transceiver.to_account_metas(None));
                    account_metas.extend(self.emitter.to_account_metas(None));
                    account_metas.extend(self.wormhole_bridge.to_account_metas(None));
                    account_metas
                        .extend(self.wormhole_fee_collector.to_account_metas(None));
                    account_metas.extend(self.wormhole_sequence.to_account_metas(None));
                    account_metas.extend(self.wormhole_program.to_account_metas(None));
                    account_metas
                        .extend(self.ntt_with_executor_program.to_account_metas(None));
                    account_metas.extend(self.executor_program.to_account_metas(None));
                    account_metas.extend(self.ntt_peer.to_account_metas(None));
                    account_metas.extend(self.ntt_outbox_item.to_account_metas(None));
                    account_metas
                        .extend(self.ntt_outbox_rate_limit.to_account_metas(None));
                    account_metas.extend(self.ntt_custody.to_account_metas(None));
                    account_metas
                        .extend(self.payee_ntt_with_executor.to_account_metas(None));
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::AccountsExit<'info> for Ntt<'info>
            where
                'info: 'info,
            {
                fn exit(
                    &self,
                    program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                ) -> anchor_lang::Result<()> {
                    anchor_lang::AccountsExit::exit(
                            &self.ntt_inbox_rate_limit,
                            program_id,
                        )
                        .map_err(|e| e.with_account_name("ntt_inbox_rate_limit"))?;
                    anchor_lang::AccountsExit::exit(&self.wormhole_message, program_id)
                        .map_err(|e| e.with_account_name("wormhole_message"))?;
                    anchor_lang::AccountsExit::exit(&self.wormhole_bridge, program_id)
                        .map_err(|e| e.with_account_name("wormhole_bridge"))?;
                    anchor_lang::AccountsExit::exit(
                            &self.wormhole_fee_collector,
                            program_id,
                        )
                        .map_err(|e| e.with_account_name("wormhole_fee_collector"))?;
                    anchor_lang::AccountsExit::exit(&self.wormhole_sequence, program_id)
                        .map_err(|e| e.with_account_name("wormhole_sequence"))?;
                    anchor_lang::AccountsExit::exit(&self.ntt_outbox_item, program_id)
                        .map_err(|e| e.with_account_name("ntt_outbox_item"))?;
                    anchor_lang::AccountsExit::exit(
                            &self.ntt_outbox_rate_limit,
                            program_id,
                        )
                        .map_err(|e| e.with_account_name("ntt_outbox_rate_limit"))?;
                    anchor_lang::AccountsExit::exit(&self.ntt_custody, program_id)
                        .map_err(|e| e.with_account_name("ntt_custody"))?;
                    anchor_lang::AccountsExit::exit(
                            &self.payee_ntt_with_executor,
                            program_id,
                        )
                        .map_err(|e| e.with_account_name("payee_ntt_with_executor"))?;
                    Ok(())
                }
            }
            pub struct NttBumps {}
            #[automatically_derived]
            impl ::core::fmt::Debug for NttBumps {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::write_str(f, "NttBumps")
                }
            }
            impl Default for NttBumps {
                fn default() -> Self {
                    NttBumps {}
                }
            }
            impl<'info> anchor_lang::Bumps for Ntt<'info>
            where
                'info: 'info,
            {
                type Bumps = NttBumps;
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
            /// instead of an `AccountInfo`. This is useful for clients that want
            /// to generate a list of accounts, without explicitly knowing the
            /// order all the fields should be in.
            ///
            /// To access the struct in this module, one should use the sibling
            /// `accounts` module (also generated), which re-exports this.
            pub(crate) mod __client_accounts_ntt {
                use super::*;
                use anchor_lang::prelude::borsh;
                /// Generated client accounts for [`Ntt`].
                pub struct Ntt {
                    pub clock: Pubkey,
                    pub rent: Pubkey,
                    pub ntt_manager: Pubkey,
                    pub ntt_config: Pubkey,
                    pub ntt_inbox_rate_limit: Pubkey,
                    pub ntt_session_authority: Pubkey,
                    pub ntt_token_authority: Pubkey,
                    pub wormhole_message: Pubkey,
                    pub transceiver: Pubkey,
                    pub emitter: Pubkey,
                    pub wormhole_bridge: Pubkey,
                    pub wormhole_fee_collector: Pubkey,
                    pub wormhole_sequence: Pubkey,
                    pub wormhole_program: Pubkey,
                    pub ntt_with_executor_program: Pubkey,
                    pub executor_program: Pubkey,
                    pub ntt_peer: Pubkey,
                    pub ntt_outbox_item: Pubkey,
                    pub ntt_outbox_rate_limit: Pubkey,
                    pub ntt_custody: Pubkey,
                    pub payee_ntt_with_executor: Pubkey,
                }
                impl borsh::ser::BorshSerialize for Ntt
                where
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                {
                    fn serialize<W: borsh::maybestd::io::Write>(
                        &self,
                        writer: &mut W,
                    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                        borsh::BorshSerialize::serialize(&self.clock, writer)?;
                        borsh::BorshSerialize::serialize(&self.rent, writer)?;
                        borsh::BorshSerialize::serialize(&self.ntt_manager, writer)?;
                        borsh::BorshSerialize::serialize(&self.ntt_config, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.ntt_inbox_rate_limit,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.ntt_session_authority,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.ntt_token_authority,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.wormhole_message,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.transceiver, writer)?;
                        borsh::BorshSerialize::serialize(&self.emitter, writer)?;
                        borsh::BorshSerialize::serialize(&self.wormhole_bridge, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.wormhole_fee_collector,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.wormhole_sequence,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.wormhole_program,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.ntt_with_executor_program,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.executor_program,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.ntt_peer, writer)?;
                        borsh::BorshSerialize::serialize(&self.ntt_outbox_item, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.ntt_outbox_rate_limit,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.ntt_custody, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.payee_ntt_with_executor,
                            writer,
                        )?;
                        Ok(())
                    }
                }
                #[automatically_derived]
                impl anchor_lang::ToAccountMetas for Ntt {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.clock,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.rent,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.ntt_manager,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.ntt_config,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.ntt_inbox_rate_limit,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.ntt_session_authority,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.ntt_token_authority,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.wormhole_message,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.transceiver,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.emitter,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.wormhole_bridge,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.wormhole_fee_collector,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.wormhole_sequence,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.wormhole_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.ntt_with_executor_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.executor_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.ntt_peer,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.ntt_outbox_item,
                                    true,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.ntt_outbox_rate_limit,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.ntt_custody,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.payee_ntt_with_executor,
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a CPI struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is an
            /// AccountInfo.
            ///
            /// To access the struct in this module, one should use the sibling
            /// [`cpi::accounts`] module (also generated), which re-exports this.
            pub(crate) mod __cpi_client_accounts_ntt {
                use super::*;
                /// Generated CPI struct of the accounts for [`Ntt`].
                pub struct Ntt<'info> {
                    pub clock: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub rent: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_manager: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_config: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_inbox_rate_limit: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_session_authority: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_token_authority: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub wormhole_message: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub transceiver: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub emitter: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub wormhole_bridge: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub wormhole_fee_collector: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub wormhole_sequence: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub wormhole_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_with_executor_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub executor_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_peer: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_outbox_item: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_outbox_rate_limit: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_custody: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub payee_ntt_with_executor: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountMetas for Ntt<'info> {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.clock),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.rent),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.ntt_manager),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.ntt_config),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.ntt_inbox_rate_limit),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.ntt_session_authority),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.ntt_token_authority),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.wormhole_message),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.transceiver),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.emitter),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.wormhole_bridge),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.wormhole_fee_collector),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.wormhole_sequence),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.wormhole_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.ntt_with_executor_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.executor_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.ntt_peer),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.ntt_outbox_item),
                                    true,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.ntt_outbox_rate_limit),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.ntt_custody),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.payee_ntt_with_executor),
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountInfos<'info> for Ntt<'info> {
                    fn to_account_infos(
                        &self,
                    ) -> Vec<
                        anchor_lang::solana_program::account_info::AccountInfo<'info>,
                    > {
                        let mut account_infos = ::alloc::vec::Vec::new();
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.clock),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.rent),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_manager,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_config,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_inbox_rate_limit,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_session_authority,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_token_authority,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.wormhole_message,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.transceiver,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.emitter),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.wormhole_bridge,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.wormhole_fee_collector,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.wormhole_sequence,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.wormhole_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_with_executor_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.executor_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_peer,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_outbox_item,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_outbox_rate_limit,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_custody,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.payee_ntt_with_executor,
                                ),
                            );
                        account_infos
                    }
                }
            }
            pub struct BridgeNttTokens<'info> {
                #[account(seeds = [chain_id::SEED], seeds::program = chain_id::ID, bump)]
                pub from_chain_id: Account<'info, ChainId>,
                /// CHECK: we check the address of this account
                #[account(address = instructions::ID)]
                pub sysvar_instructions: UncheckedAccount<'info>,
                /// CHECK: this is just a signer for token program CPIs
                #[account(seeds = [INTENT_TRANSFER_SEED], bump)]
                pub intent_transfer_setter: UncheckedAccount<'info>,
                pub token_program: Program<'info, Token>,
                #[account(mut, token::mint = mint)]
                pub source: Account<'info, TokenAccount>,
                #[account(
                    init_if_needed,
                    payer = sponsor,
                    seeds = [BRIDGE_NTT_INTERMEDIATE_SEED,
                    source.key().as_ref()],
                    bump,
                    token::mint = mint,
                    token::authority = intent_transfer_setter,
                )]
                pub intermediate_token_account: Account<'info, TokenAccount>,
                #[account(mut)]
                pub mint: Account<'info, Mint>,
                pub metadata: Option<UncheckedAccount<'info>>,
                #[account(seeds = [EXPECTED_NTT_CONFIG_SEED, mint.key().as_ref()], bump)]
                pub expected_ntt_config: Account<'info, ExpectedNttConfig>,
                #[account(
                    init_if_needed,
                    payer = sponsor,
                    space = Nonce::DISCRIMINATOR.len()+Nonce::INIT_SPACE,
                    seeds = [BRIDGE_NTT_NONCE_SEED,
                    source.owner.key().as_ref()],
                    bump
                )]
                pub nonce: Account<'info, Nonce>,
                #[account(mut)]
                pub sponsor: Signer<'info>,
                pub system_program: Program<'info, System>,
                pub ntt: Ntt<'info>,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::Accounts<'info, BridgeNttTokensBumps>
            for BridgeNttTokens<'info>
            where
                'info: 'info,
            {
                #[inline(never)]
                fn try_accounts(
                    __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                    __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >],
                    __ix_data: &[u8],
                    __bumps: &mut BridgeNttTokensBumps,
                    __reallocs: &mut std::collections::BTreeSet<
                        anchor_lang::solana_program::pubkey::Pubkey,
                    >,
                ) -> anchor_lang::Result<Self> {
                    let from_chain_id: anchor_lang::accounts::account::Account<
                        ChainId,
                    > = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("from_chain_id"))?;
                    let sysvar_instructions: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("sysvar_instructions"))?;
                    let intent_transfer_setter: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("intent_transfer_setter"))?;
                    let token_program: anchor_lang::accounts::program::Program<Token> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("token_program"))?;
                    let source: anchor_lang::accounts::account::Account<TokenAccount> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("source"))?;
                    if __accounts.is_empty() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into(),
                        );
                    }
                    let intermediate_token_account = &__accounts[0];
                    *__accounts = &__accounts[1..];
                    let mint: anchor_lang::accounts::account::Account<Mint> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("mint"))?;
                    let metadata: Option<UncheckedAccount> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("metadata"))?;
                    let expected_ntt_config: anchor_lang::accounts::account::Account<
                        ExpectedNttConfig,
                    > = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("expected_ntt_config"))?;
                    if __accounts.is_empty() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into(),
                        );
                    }
                    let nonce = &__accounts[0];
                    *__accounts = &__accounts[1..];
                    let sponsor: Signer = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("sponsor"))?;
                    let system_program: anchor_lang::accounts::program::Program<
                        System,
                    > = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("system_program"))?;
                    let ntt: Ntt<'info> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        &mut __bumps.ntt,
                        __reallocs,
                    )?;
                    let __anchor_rent = Rent::get()?;
                    let (__pda_address, __bump) = Pubkey::find_program_address(
                        &[BRIDGE_NTT_INTERMEDIATE_SEED, source.key().as_ref()],
                        __program_id,
                    );
                    __bumps.intermediate_token_account = __bump;
                    if intermediate_token_account.key() != __pda_address {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintSeeds,
                                )
                                .with_account_name("intermediate_token_account")
                                .with_pubkeys((
                                    intermediate_token_account.key(),
                                    __pda_address,
                                )),
                        );
                    }
                    let intermediate_token_account: anchor_lang::accounts::account::Account<
                        TokenAccount,
                    > = ({
                        #[inline(never)]
                        || {
                            let owner_program = AsRef::<
                                AccountInfo,
                            >::as_ref(&intermediate_token_account)
                                .owner;
                            if !true
                                || owner_program
                                    == &anchor_lang::solana_program::system_program::ID
                            {
                                let __current_lamports = intermediate_token_account
                                    .lamports();
                                if __current_lamports == 0 {
                                    let space = {
                                        let mint_info = mint.to_account_info();
                                        if *mint_info.owner
                                            == ::anchor_spl::token_2022::Token2022::id()
                                        {
                                            use ::anchor_spl::token_2022::spl_token_2022::extension::{
                                                BaseStateWithExtensions, ExtensionType, StateWithExtensions,
                                            };
                                            use ::anchor_spl::token_2022::spl_token_2022::state::{
                                                Account, Mint,
                                            };
                                            let mint_data = mint_info.try_borrow_data()?;
                                            let mint_state = StateWithExtensions::<
                                                Mint,
                                            >::unpack(&mint_data)?;
                                            let mint_extensions = mint_state.get_extension_types()?;
                                            let required_extensions = ExtensionType::get_required_init_account_extensions(
                                                &mint_extensions,
                                            );
                                            ExtensionType::try_calculate_account_len::<
                                                Account,
                                            >(&required_extensions)?
                                        } else {
                                            ::anchor_spl::token::TokenAccount::LEN
                                        }
                                    };
                                    let lamports = __anchor_rent.minimum_balance(space);
                                    let cpi_accounts = anchor_lang::system_program::CreateAccount {
                                        from: sponsor.to_account_info(),
                                        to: intermediate_token_account.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::create_account(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        BRIDGE_NTT_INTERMEDIATE_SEED,
                                                        source.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        lamports,
                                        space as u64,
                                        &token_program.key(),
                                    )?;
                                } else {
                                    if sponsor.key() == intermediate_token_account.key() {
                                        return Err(
                                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                                    error_name: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .name(),
                                                    error_code_number: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .into(),
                                                    error_msg: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .to_string(),
                                                    error_origin: Some(
                                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                            filename: "programs/intent-transfer/src/bridge/processor/bridge_ntt_tokens.rs",
                                                            line: 112u32,
                                                        }),
                                                    ),
                                                    compared_values: None,
                                                })
                                                .with_pubkeys((
                                                    sponsor.key(),
                                                    intermediate_token_account.key(),
                                                )),
                                        );
                                    }
                                    let required_lamports = __anchor_rent
                                        .minimum_balance({
                                            let mint_info = mint.to_account_info();
                                            if *mint_info.owner
                                                == ::anchor_spl::token_2022::Token2022::id()
                                            {
                                                use ::anchor_spl::token_2022::spl_token_2022::extension::{
                                                    BaseStateWithExtensions, ExtensionType, StateWithExtensions,
                                                };
                                                use ::anchor_spl::token_2022::spl_token_2022::state::{
                                                    Account, Mint,
                                                };
                                                let mint_data = mint_info.try_borrow_data()?;
                                                let mint_state = StateWithExtensions::<
                                                    Mint,
                                                >::unpack(&mint_data)?;
                                                let mint_extensions = mint_state.get_extension_types()?;
                                                let required_extensions = ExtensionType::get_required_init_account_extensions(
                                                    &mint_extensions,
                                                );
                                                ExtensionType::try_calculate_account_len::<
                                                    Account,
                                                >(&required_extensions)?
                                            } else {
                                                ::anchor_spl::token::TokenAccount::LEN
                                            }
                                        })
                                        .max(1)
                                        .saturating_sub(__current_lamports);
                                    if required_lamports > 0 {
                                        let cpi_accounts = anchor_lang::system_program::Transfer {
                                            from: sponsor.to_account_info(),
                                            to: intermediate_token_account.to_account_info(),
                                        };
                                        let cpi_context = anchor_lang::context::CpiContext::new(
                                            system_program.to_account_info(),
                                            cpi_accounts,
                                        );
                                        anchor_lang::system_program::transfer(
                                            cpi_context,
                                            required_lamports,
                                        )?;
                                    }
                                    let cpi_accounts = anchor_lang::system_program::Allocate {
                                        account_to_allocate: intermediate_token_account
                                            .to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::allocate(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        BRIDGE_NTT_INTERMEDIATE_SEED,
                                                        source.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        {
                                            let mint_info = mint.to_account_info();
                                            if *mint_info.owner
                                                == ::anchor_spl::token_2022::Token2022::id()
                                            {
                                                use ::anchor_spl::token_2022::spl_token_2022::extension::{
                                                    BaseStateWithExtensions, ExtensionType, StateWithExtensions,
                                                };
                                                use ::anchor_spl::token_2022::spl_token_2022::state::{
                                                    Account, Mint,
                                                };
                                                let mint_data = mint_info.try_borrow_data()?;
                                                let mint_state = StateWithExtensions::<
                                                    Mint,
                                                >::unpack(&mint_data)?;
                                                let mint_extensions = mint_state.get_extension_types()?;
                                                let required_extensions = ExtensionType::get_required_init_account_extensions(
                                                    &mint_extensions,
                                                );
                                                ExtensionType::try_calculate_account_len::<
                                                    Account,
                                                >(&required_extensions)?
                                            } else {
                                                ::anchor_spl::token::TokenAccount::LEN
                                            }
                                        } as u64,
                                    )?;
                                    let cpi_accounts = anchor_lang::system_program::Assign {
                                        account_to_assign: intermediate_token_account
                                            .to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::assign(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        BRIDGE_NTT_INTERMEDIATE_SEED,
                                                        source.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        &token_program.key(),
                                    )?;
                                }
                                let cpi_program = token_program.to_account_info();
                                let accounts = ::anchor_spl::token_interface::InitializeAccount3 {
                                    account: intermediate_token_account.to_account_info(),
                                    mint: mint.to_account_info(),
                                    authority: intent_transfer_setter.to_account_info(),
                                };
                                let cpi_ctx = anchor_lang::context::CpiContext::new(
                                    cpi_program,
                                    accounts,
                                );
                                ::anchor_spl::token_interface::initialize_account3(
                                    cpi_ctx,
                                )?;
                            }
                            let pa: anchor_lang::accounts::account::Account<
                                TokenAccount,
                            > = match anchor_lang::accounts::account::Account::try_from_unchecked(
                                &intermediate_token_account,
                            ) {
                                Ok(val) => val,
                                Err(e) => {
                                    return Err(
                                        e.with_account_name("intermediate_token_account"),
                                    );
                                }
                            };
                            if true {
                                if pa.mint != mint.key() {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintTokenMint,
                                            )
                                            .with_account_name("intermediate_token_account")
                                            .with_pubkeys((pa.mint, mint.key())),
                                    );
                                }
                                if pa.owner != intent_transfer_setter.key() {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintTokenOwner,
                                            )
                                            .with_account_name("intermediate_token_account")
                                            .with_pubkeys((pa.owner, intent_transfer_setter.key())),
                                    );
                                }
                                if owner_program != &token_program.key() {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintTokenTokenProgram,
                                            )
                                            .with_account_name("intermediate_token_account")
                                            .with_pubkeys((*owner_program, token_program.key())),
                                    );
                                }
                            }
                            Ok(pa)
                        }
                    })()?;
                    if !AsRef::<AccountInfo>::as_ref(&intermediate_token_account)
                        .is_writable
                    {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("intermediate_token_account"),
                        );
                    }
                    if !__anchor_rent
                        .is_exempt(
                            intermediate_token_account.to_account_info().lamports(),
                            intermediate_token_account.to_account_info().try_data_len()?,
                        )
                    {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                )
                                .with_account_name("intermediate_token_account"),
                        );
                    }
                    let __anchor_rent = Rent::get()?;
                    let (__pda_address, __bump) = Pubkey::find_program_address(
                        &[BRIDGE_NTT_NONCE_SEED, source.owner.key().as_ref()],
                        __program_id,
                    );
                    __bumps.nonce = __bump;
                    if nonce.key() != __pda_address {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintSeeds,
                                )
                                .with_account_name("nonce")
                                .with_pubkeys((nonce.key(), __pda_address)),
                        );
                    }
                    let nonce = ({
                        #[inline(never)]
                        || {
                            let actual_field = AsRef::<AccountInfo>::as_ref(&nonce);
                            let actual_owner = actual_field.owner;
                            let space = Nonce::DISCRIMINATOR.len() + Nonce::INIT_SPACE;
                            let pa: anchor_lang::accounts::account::Account<Nonce> = if !true
                                || actual_owner
                                    == &anchor_lang::solana_program::system_program::ID
                            {
                                let __current_lamports = nonce.lamports();
                                if __current_lamports == 0 {
                                    let space = space;
                                    let lamports = __anchor_rent.minimum_balance(space);
                                    let cpi_accounts = anchor_lang::system_program::CreateAccount {
                                        from: sponsor.to_account_info(),
                                        to: nonce.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::create_account(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        BRIDGE_NTT_NONCE_SEED,
                                                        source.owner.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        lamports,
                                        space as u64,
                                        __program_id,
                                    )?;
                                } else {
                                    if sponsor.key() == nonce.key() {
                                        return Err(
                                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                                    error_name: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .name(),
                                                    error_code_number: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .into(),
                                                    error_msg: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .to_string(),
                                                    error_origin: Some(
                                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                            filename: "programs/intent-transfer/src/bridge/processor/bridge_ntt_tokens.rs",
                                                            line: 112u32,
                                                        }),
                                                    ),
                                                    compared_values: None,
                                                })
                                                .with_pubkeys((sponsor.key(), nonce.key())),
                                        );
                                    }
                                    let required_lamports = __anchor_rent
                                        .minimum_balance(space)
                                        .max(1)
                                        .saturating_sub(__current_lamports);
                                    if required_lamports > 0 {
                                        let cpi_accounts = anchor_lang::system_program::Transfer {
                                            from: sponsor.to_account_info(),
                                            to: nonce.to_account_info(),
                                        };
                                        let cpi_context = anchor_lang::context::CpiContext::new(
                                            system_program.to_account_info(),
                                            cpi_accounts,
                                        );
                                        anchor_lang::system_program::transfer(
                                            cpi_context,
                                            required_lamports,
                                        )?;
                                    }
                                    let cpi_accounts = anchor_lang::system_program::Allocate {
                                        account_to_allocate: nonce.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::allocate(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        BRIDGE_NTT_NONCE_SEED,
                                                        source.owner.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        space as u64,
                                    )?;
                                    let cpi_accounts = anchor_lang::system_program::Assign {
                                        account_to_assign: nonce.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::assign(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        BRIDGE_NTT_NONCE_SEED,
                                                        source.owner.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        __program_id,
                                    )?;
                                }
                                match anchor_lang::accounts::account::Account::try_from_unchecked(
                                    &nonce,
                                ) {
                                    Ok(val) => val,
                                    Err(e) => return Err(e.with_account_name("nonce")),
                                }
                            } else {
                                match anchor_lang::accounts::account::Account::try_from(
                                    &nonce,
                                ) {
                                    Ok(val) => val,
                                    Err(e) => return Err(e.with_account_name("nonce")),
                                }
                            };
                            if true {
                                if space != actual_field.data_len() {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintSpace,
                                            )
                                            .with_account_name("nonce")
                                            .with_values((space, actual_field.data_len())),
                                    );
                                }
                                if actual_owner != __program_id {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintOwner,
                                            )
                                            .with_account_name("nonce")
                                            .with_pubkeys((*actual_owner, *__program_id)),
                                    );
                                }
                                {
                                    let required_lamports = __anchor_rent
                                        .minimum_balance(space);
                                    if pa.to_account_info().lamports() < required_lamports {
                                        return Err(
                                            anchor_lang::error::Error::from(
                                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                                )
                                                .with_account_name("nonce"),
                                        );
                                    }
                                }
                            }
                            Ok(pa)
                        }
                    })()?;
                    if !AsRef::<AccountInfo>::as_ref(&nonce).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("nonce"),
                        );
                    }
                    if !__anchor_rent
                        .is_exempt(
                            nonce.to_account_info().lamports(),
                            nonce.to_account_info().try_data_len()?,
                        )
                    {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                )
                                .with_account_name("nonce"),
                        );
                    }
                    let (__pda_address, __bump) = Pubkey::find_program_address(
                        &[chain_id::SEED],
                        &chain_id::ID.key(),
                    );
                    __bumps.from_chain_id = __bump;
                    if from_chain_id.key() != __pda_address {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintSeeds,
                                )
                                .with_account_name("from_chain_id")
                                .with_pubkeys((from_chain_id.key(), __pda_address)),
                        );
                    }
                    {
                        let actual = sysvar_instructions.key();
                        let expected = instructions::ID;
                        if actual != expected {
                            return Err(
                                anchor_lang::error::Error::from(
                                        anchor_lang::error::ErrorCode::ConstraintAddress,
                                    )
                                    .with_account_name("sysvar_instructions")
                                    .with_pubkeys((actual, expected)),
                            );
                        }
                    }
                    let (__pda_address, __bump) = Pubkey::find_program_address(
                        &[INTENT_TRANSFER_SEED],
                        &__program_id,
                    );
                    __bumps.intent_transfer_setter = __bump;
                    if intent_transfer_setter.key() != __pda_address {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintSeeds,
                                )
                                .with_account_name("intent_transfer_setter")
                                .with_pubkeys((intent_transfer_setter.key(), __pda_address)),
                        );
                    }
                    if !AsRef::<AccountInfo>::as_ref(&source).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("source"),
                        );
                    }
                    {
                        if source.mint != mint.key() {
                            return Err(
                                anchor_lang::error::ErrorCode::ConstraintTokenMint.into(),
                            );
                        }
                    }
                    if !AsRef::<AccountInfo>::as_ref(&mint).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("mint"),
                        );
                    }
                    let (__pda_address, __bump) = Pubkey::find_program_address(
                        &[EXPECTED_NTT_CONFIG_SEED, mint.key().as_ref()],
                        &__program_id,
                    );
                    __bumps.expected_ntt_config = __bump;
                    if expected_ntt_config.key() != __pda_address {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintSeeds,
                                )
                                .with_account_name("expected_ntt_config")
                                .with_pubkeys((expected_ntt_config.key(), __pda_address)),
                        );
                    }
                    if !AsRef::<AccountInfo>::as_ref(&sponsor).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("sponsor"),
                        );
                    }
                    Ok(BridgeNttTokens {
                        from_chain_id,
                        sysvar_instructions,
                        intent_transfer_setter,
                        token_program,
                        source,
                        intermediate_token_account,
                        mint,
                        metadata,
                        expected_ntt_config,
                        nonce,
                        sponsor,
                        system_program,
                        ntt,
                    })
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for BridgeNttTokens<'info>
            where
                'info: 'info,
            {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos.extend(self.from_chain_id.to_account_infos());
                    account_infos.extend(self.sysvar_instructions.to_account_infos());
                    account_infos.extend(self.intent_transfer_setter.to_account_infos());
                    account_infos.extend(self.token_program.to_account_infos());
                    account_infos.extend(self.source.to_account_infos());
                    account_infos
                        .extend(self.intermediate_token_account.to_account_infos());
                    account_infos.extend(self.mint.to_account_infos());
                    account_infos.extend(self.metadata.to_account_infos());
                    account_infos.extend(self.expected_ntt_config.to_account_infos());
                    account_infos.extend(self.nonce.to_account_infos());
                    account_infos.extend(self.sponsor.to_account_infos());
                    account_infos.extend(self.system_program.to_account_infos());
                    account_infos.extend(self.ntt.to_account_infos());
                    account_infos
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for BridgeNttTokens<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas.extend(self.from_chain_id.to_account_metas(None));
                    account_metas
                        .extend(self.sysvar_instructions.to_account_metas(None));
                    account_metas
                        .extend(self.intent_transfer_setter.to_account_metas(None));
                    account_metas.extend(self.token_program.to_account_metas(None));
                    account_metas.extend(self.source.to_account_metas(None));
                    account_metas
                        .extend(self.intermediate_token_account.to_account_metas(None));
                    account_metas.extend(self.mint.to_account_metas(None));
                    if let Some(metadata) = &self.metadata {
                        account_metas.extend(metadata.to_account_metas(None));
                    } else {
                        account_metas.push(AccountMeta::new_readonly(crate::ID, false));
                    }
                    account_metas
                        .extend(self.expected_ntt_config.to_account_metas(None));
                    account_metas.extend(self.nonce.to_account_metas(None));
                    account_metas.extend(self.sponsor.to_account_metas(None));
                    account_metas.extend(self.system_program.to_account_metas(None));
                    account_metas.extend(self.ntt.to_account_metas(None));
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::AccountsExit<'info> for BridgeNttTokens<'info>
            where
                'info: 'info,
            {
                fn exit(
                    &self,
                    program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                ) -> anchor_lang::Result<()> {
                    anchor_lang::AccountsExit::exit(&self.source, program_id)
                        .map_err(|e| e.with_account_name("source"))?;
                    anchor_lang::AccountsExit::exit(
                            &self.intermediate_token_account,
                            program_id,
                        )
                        .map_err(|e| e.with_account_name("intermediate_token_account"))?;
                    anchor_lang::AccountsExit::exit(&self.mint, program_id)
                        .map_err(|e| e.with_account_name("mint"))?;
                    anchor_lang::AccountsExit::exit(&self.nonce, program_id)
                        .map_err(|e| e.with_account_name("nonce"))?;
                    anchor_lang::AccountsExit::exit(&self.sponsor, program_id)
                        .map_err(|e| e.with_account_name("sponsor"))?;
                    anchor_lang::AccountsExit::exit(&self.ntt, program_id)
                        .map_err(|e| e.with_account_name("ntt"))?;
                    Ok(())
                }
            }
            pub struct BridgeNttTokensBumps {
                pub from_chain_id: u8,
                pub intent_transfer_setter: u8,
                pub intermediate_token_account: u8,
                pub expected_ntt_config: u8,
                pub nonce: u8,
                pub ntt: NttBumps,
            }
            #[automatically_derived]
            impl ::core::fmt::Debug for BridgeNttTokensBumps {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    let names: &'static _ = &[
                        "from_chain_id",
                        "intent_transfer_setter",
                        "intermediate_token_account",
                        "expected_ntt_config",
                        "nonce",
                        "ntt",
                    ];
                    let values: &[&dyn ::core::fmt::Debug] = &[
                        &self.from_chain_id,
                        &self.intent_transfer_setter,
                        &self.intermediate_token_account,
                        &self.expected_ntt_config,
                        &self.nonce,
                        &&self.ntt,
                    ];
                    ::core::fmt::Formatter::debug_struct_fields_finish(
                        f,
                        "BridgeNttTokensBumps",
                        names,
                        values,
                    )
                }
            }
            impl Default for BridgeNttTokensBumps {
                fn default() -> Self {
                    BridgeNttTokensBumps {
                        from_chain_id: u8::MAX,
                        intent_transfer_setter: u8::MAX,
                        intermediate_token_account: u8::MAX,
                        expected_ntt_config: u8::MAX,
                        nonce: u8::MAX,
                        ntt: NttBumps::default(),
                    }
                }
            }
            impl<'info> anchor_lang::Bumps for BridgeNttTokens<'info>
            where
                'info: 'info,
            {
                type Bumps = BridgeNttTokensBumps;
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
            /// instead of an `AccountInfo`. This is useful for clients that want
            /// to generate a list of accounts, without explicitly knowing the
            /// order all the fields should be in.
            ///
            /// To access the struct in this module, one should use the sibling
            /// `accounts` module (also generated), which re-exports this.
            pub(crate) mod __client_accounts_bridge_ntt_tokens {
                use super::*;
                use anchor_lang::prelude::borsh;
                pub use __client_accounts_ntt::Ntt;
                /// Generated client accounts for [`BridgeNttTokens`].
                pub struct BridgeNttTokens {
                    pub from_chain_id: Pubkey,
                    pub sysvar_instructions: Pubkey,
                    pub intent_transfer_setter: Pubkey,
                    pub token_program: Pubkey,
                    pub source: Pubkey,
                    pub intermediate_token_account: Pubkey,
                    pub mint: Pubkey,
                    pub metadata: Option<Pubkey>,
                    pub expected_ntt_config: Pubkey,
                    pub nonce: Pubkey,
                    pub sponsor: Pubkey,
                    pub system_program: Pubkey,
                    pub ntt: __client_accounts_ntt::Ntt,
                }
                impl borsh::ser::BorshSerialize for BridgeNttTokens
                where
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Option<Pubkey>: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    __client_accounts_ntt::Ntt: borsh::ser::BorshSerialize,
                {
                    fn serialize<W: borsh::maybestd::io::Write>(
                        &self,
                        writer: &mut W,
                    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                        borsh::BorshSerialize::serialize(&self.from_chain_id, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.sysvar_instructions,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.intent_transfer_setter,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.token_program, writer)?;
                        borsh::BorshSerialize::serialize(&self.source, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.intermediate_token_account,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.mint, writer)?;
                        borsh::BorshSerialize::serialize(&self.metadata, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.expected_ntt_config,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.nonce, writer)?;
                        borsh::BorshSerialize::serialize(&self.sponsor, writer)?;
                        borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                        borsh::BorshSerialize::serialize(&self.ntt, writer)?;
                        Ok(())
                    }
                }
                #[automatically_derived]
                impl anchor_lang::ToAccountMetas for BridgeNttTokens {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.from_chain_id,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.sysvar_instructions,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.intent_transfer_setter,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.token_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.source,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.intermediate_token_account,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.mint,
                                    false,
                                ),
                            );
                        if let Some(metadata) = &self.metadata {
                            account_metas
                                .push(
                                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                        *metadata,
                                        false,
                                    ),
                                );
                        } else {
                            account_metas
                                .push(
                                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                        crate::ID,
                                        false,
                                    ),
                                );
                        }
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.expected_ntt_config,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.nonce,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.sponsor,
                                    true,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.system_program,
                                    false,
                                ),
                            );
                        account_metas.extend(self.ntt.to_account_metas(None));
                        account_metas
                    }
                }
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a CPI struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is an
            /// AccountInfo.
            ///
            /// To access the struct in this module, one should use the sibling
            /// [`cpi::accounts`] module (also generated), which re-exports this.
            pub(crate) mod __cpi_client_accounts_bridge_ntt_tokens {
                use super::*;
                pub use __cpi_client_accounts_ntt::Ntt;
                /// Generated CPI struct of the accounts for [`BridgeNttTokens`].
                pub struct BridgeNttTokens<'info> {
                    pub from_chain_id: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub sysvar_instructions: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub intent_transfer_setter: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub source: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub intermediate_token_account: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub mint: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub metadata: Option<
                        anchor_lang::solana_program::account_info::AccountInfo<'info>,
                    >,
                    pub expected_ntt_config: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub nonce: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub sponsor: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt: __cpi_client_accounts_ntt::Ntt<'info>,
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountMetas for BridgeNttTokens<'info> {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.from_chain_id),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.sysvar_instructions),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.intent_transfer_setter),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.token_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.source),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.intermediate_token_account),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.mint),
                                    false,
                                ),
                            );
                        if let Some(metadata) = &self.metadata {
                            account_metas
                                .push(
                                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                        anchor_lang::Key::key(metadata),
                                        false,
                                    ),
                                );
                        } else {
                            account_metas
                                .push(
                                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                        crate::ID,
                                        false,
                                    ),
                                );
                        }
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.expected_ntt_config),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.nonce),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.sponsor),
                                    true,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.system_program),
                                    false,
                                ),
                            );
                        account_metas.extend(self.ntt.to_account_metas(None));
                        account_metas
                    }
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountInfos<'info>
                for BridgeNttTokens<'info> {
                    fn to_account_infos(
                        &self,
                    ) -> Vec<
                        anchor_lang::solana_program::account_info::AccountInfo<'info>,
                    > {
                        let mut account_infos = ::alloc::vec::Vec::new();
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.from_chain_id,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.sysvar_instructions,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.intent_transfer_setter,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.token_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.source),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.intermediate_token_account,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.mint),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.metadata,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.expected_ntt_config,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.nonce),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.sponsor),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.system_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.ntt),
                            );
                        account_infos
                    }
                }
            }
            impl<'info> BridgeNttTokens<'info> {
                pub fn verify_and_initiate_bridge(
                    &mut self,
                    signer_seeds: &[&[&[u8]]],
                    args: BridgeNttTokensArgs,
                ) -> Result<()> {
                    let Intent { message, signer } = Intent::<
                        BridgeMessage,
                    >::load(self.sysvar_instructions.as_ref())
                        .map_err(Into::<IntentTransferError>::into)?;
                    match message {
                        BridgeMessage::Ntt(ntt_message) => {
                            self.process_ntt_bridge(
                                ntt_message,
                                signer,
                                signer_seeds,
                                args,
                            )
                        }
                    }
                }
                fn process_ntt_bridge(
                    &mut self,
                    ntt_message: NttMessage,
                    signer: Pubkey,
                    signer_seeds: &[&[&[u8]]],
                    args: BridgeNttTokensArgs,
                ) -> Result<()> {
                    let Self {
                        from_chain_id,
                        intent_transfer_setter,
                        metadata,
                        mint,
                        source,
                        intermediate_token_account,
                        sysvar_instructions: _,
                        token_program,
                        expected_ntt_config,
                        nonce,
                        sponsor,
                        system_program,
                        ntt,
                    } = self;
                    let Ntt {
                        clock,
                        rent,
                        ntt_manager,
                        ntt_config,
                        ntt_inbox_rate_limit,
                        ntt_session_authority,
                        ntt_token_authority,
                        wormhole_message,
                        transceiver,
                        emitter,
                        wormhole_bridge,
                        wormhole_fee_collector,
                        wormhole_sequence,
                        wormhole_program,
                        ntt_with_executor_program,
                        executor_program,
                        ntt_peer,
                        ntt_outbox_item,
                        ntt_outbox_rate_limit,
                        ntt_custody,
                        payee_ntt_with_executor,
                    } = ntt;
                    let NttMessage {
                        version: _,
                        from_chain_id: expected_chain_id,
                        symbol_or_mint,
                        amount: ui_amount,
                        to_chain_id,
                        recipient_address,
                        nonce: new_nonce,
                    } = ntt_message;
                    if from_chain_id.chain_id != expected_chain_id {
                        return Err(
                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                error_name: IntentTransferError::ChainIdMismatch.name(),
                                error_code_number: IntentTransferError::ChainIdMismatch
                                    .into(),
                                error_msg: IntentTransferError::ChainIdMismatch.to_string(),
                                error_origin: Some(
                                    anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                        filename: "programs/intent-transfer/src/bridge/processor/bridge_ntt_tokens.rs",
                                        line: 245u32,
                                    }),
                                ),
                                compared_values: None,
                            }),
                        );
                    }
                    verify_symbol_or_mint(&symbol_or_mint, metadata, mint)?;
                    verify_signer_matches_source(signer, source.owner)?;
                    verify_and_update_nonce(nonce, new_nonce)?;
                    verify_ntt_manager(ntt_manager.key(), expected_ntt_config)?;
                    let amount = try_ui_amount_into_amount(ui_amount, mint.decimals)?;
                    transfer_checked(
                        CpiContext::new_with_signer(
                            token_program.to_account_info(),
                            TransferChecked {
                                authority: intent_transfer_setter.to_account_info(),
                                from: source.to_account_info(),
                                mint: mint.to_account_info(),
                                to: intermediate_token_account.to_account_info(),
                            },
                            signer_seeds,
                        ),
                        amount,
                        mint.decimals,
                    )?;
                    let to_chain_id_wormhole = convert_chain_id_to_wormhole(&to_chain_id)
                        .ok_or(IntentTransferError::UnsupportedToChainId)?;
                    let transfer_args = cpi::ntt_manager::TransferArgs {
                        amount,
                        recipient_chain: cpi::ntt_manager::ChainId {
                            id: to_chain_id_wormhole,
                        },
                        recipient_address: parse_recipient_address(&recipient_address)?,
                        should_queue: false,
                    };
                    approve(
                        CpiContext::new_with_signer(
                            token_program.to_account_info(),
                            Approve {
                                to: intermediate_token_account.to_account_info(),
                                delegate: ntt_session_authority.to_account_info(),
                                authority: intent_transfer_setter.to_account_info(),
                            },
                            signer_seeds,
                        ),
                        amount,
                    )?;
                    cpi::ntt_manager::transfer_burn(
                        CpiContext::new(
                            ntt_manager.to_account_info(),
                            cpi::ntt_manager::TransferBurn {
                                payer: sponsor.to_account_info(),
                                config: ntt_config.to_account_info(),
                                mint: mint.to_account_info(),
                                from: intermediate_token_account.to_account_info(),
                                token_program: token_program.to_account_info(),
                                outbox_item: ntt_outbox_item.to_account_info(),
                                outbox_rate_limit: ntt_outbox_rate_limit.to_account_info(),
                                custody: ntt_custody.to_account_info(),
                                system_program: system_program.to_account_info(),
                                inbox_rate_limit: ntt_inbox_rate_limit.to_account_info(),
                                peer: ntt_peer.to_account_info(),
                                session_authority: ntt_session_authority.to_account_info(),
                                token_authority: ntt_token_authority.to_account_info(),
                            },
                        ),
                        transfer_args,
                        ntt_manager.key(),
                    )?;
                    cpi::ntt_manager::release_wormhole_outbound(
                        CpiContext::new(
                            ntt_manager.to_account_info(),
                            cpi::ntt_manager::ReleaseWormholeOutbound {
                                payer: sponsor.to_account_info(),
                                config: ntt_config.to_account_info(),
                                outbox_item: ntt_outbox_item.to_account_info(),
                                transceiver: transceiver.to_account_info(),
                                wormhole_message: wormhole_message.to_account_info(),
                                emitter: emitter.to_account_info(),
                                wormhole_bridge: wormhole_bridge.to_account_info(),
                                wormhole_fee_collector: wormhole_fee_collector
                                    .to_account_info(),
                                wormhole_sequence: wormhole_sequence.to_account_info(),
                                wormhole_program: wormhole_program.to_account_info(),
                                system_program: system_program.to_account_info(),
                                clock: clock.to_account_info(),
                                rent: rent.to_account_info(),
                            },
                        ),
                        cpi::ntt_manager::ReleaseOutboundArgs {
                            revert_on_delay: true,
                        },
                        ntt_manager.key(),
                    )?;
                    let BridgeNttTokensArgs {
                        exec_amount,
                        signed_quote_bytes,
                        relay_instructions,
                    } = args;
                    cpi::ntt_with_executor::relay_ntt_message(
                        CpiContext::new(
                            ntt_with_executor_program.to_account_info(),
                            cpi::ntt_with_executor::RelayNttMessage {
                                payer: sponsor.to_account_info(),
                                payee: payee_ntt_with_executor.to_account_info(),
                                ntt_program_id: ntt_manager.to_account_info(),
                                ntt_peer: ntt_peer.to_account_info(),
                                ntt_message: ntt_outbox_item.to_account_info(),
                                executor_program: executor_program.to_account_info(),
                                system_program: system_program.to_account_info(),
                            },
                        ),
                        cpi::ntt_with_executor::RelayNttMessageArgs {
                            recipient_chain: to_chain_id_wormhole,
                            exec_amount,
                            signed_quote_bytes,
                            relay_instructions,
                        },
                    )?;
                    close_account(
                        CpiContext::new_with_signer(
                            token_program.to_account_info(),
                            CloseAccount {
                                account: intermediate_token_account.to_account_info(),
                                destination: sponsor.to_account_info(),
                                authority: intent_transfer_setter.to_account_info(),
                            },
                            signer_seeds,
                        ),
                    )?;
                    Ok(())
                }
            }
            /// Parses a recipient address string into a 32-byte array.
            /// Supports Solana Pubkey (base58) and hex-encoded addresses (e.g., EVM, Sui).
            fn parse_recipient_address(address_str: &str) -> Result<[u8; 32]> {
                if let Ok(pubkey) = address_str.parse::<Pubkey>() {
                    return Ok(pubkey.to_bytes());
                }
                let hex_str = address_str.strip_prefix("0x").unwrap_or(address_str);
                let bytes = hex::decode(hex_str)
                    .map_err(|_| IntentTransferError::InvalidRecipientAddress)?;
                if bytes.len() > 32 {
                    return Err(
                        anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                            error_name: IntentTransferError::InvalidRecipientAddress
                                .name(),
                            error_code_number: IntentTransferError::InvalidRecipientAddress
                                .into(),
                            error_msg: IntentTransferError::InvalidRecipientAddress
                                .to_string(),
                            error_origin: Some(
                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                    filename: "programs/intent-transfer/src/bridge/processor/bridge_ntt_tokens.rs",
                                    line: 398u32,
                                }),
                            ),
                            compared_values: None,
                        }),
                    );
                }
                let mut result = [0u8; 32];
                let start_idx = 32 - bytes.len();
                result[start_idx..].copy_from_slice(&bytes);
                Ok(result)
            }
        }
    }
}
pub mod config {
    mod access_control {
        use anchor_lang::prelude::*;
        use anchor_lang::solana_program::bpf_loader_upgradeable;
        use crate::error::IntentTransferError;
        pub struct UpgradeAuthority<'info> {
            #[account(
                mut,
                address = program_data.upgrade_authority_address.ok_or(
                    IntentTransferError::Unauthorized
                )?
            )]
            pub signer: Signer<'info>,
            #[account(
                seeds = [crate::ID.as_ref()],
                bump,
                seeds::program = bpf_loader_upgradeable::ID
            )]
            pub program_data: Account<'info, ProgramData>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, UpgradeAuthorityBumps>
        for UpgradeAuthority<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut UpgradeAuthorityBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let signer: Signer = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("signer"))?;
                let program_data: anchor_lang::accounts::account::Account<ProgramData> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("program_data"))?;
                if !AsRef::<AccountInfo>::as_ref(&signer).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("signer"),
                    );
                }
                {
                    let actual = signer.key();
                    let expected = program_data
                        .upgrade_authority_address
                        .ok_or(IntentTransferError::Unauthorized)?;
                    if actual != expected {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintAddress,
                                )
                                .with_account_name("signer")
                                .with_pubkeys((actual, expected)),
                        );
                    }
                }
                let (__pda_address, __bump) = Pubkey::find_program_address(
                    &[crate::ID.as_ref()],
                    &bpf_loader_upgradeable::ID.key(),
                );
                __bumps.program_data = __bump;
                if program_data.key() != __pda_address {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintSeeds,
                            )
                            .with_account_name("program_data")
                            .with_pubkeys((program_data.key(), __pda_address)),
                    );
                }
                Ok(UpgradeAuthority {
                    signer,
                    program_data,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for UpgradeAuthority<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.signer.to_account_infos());
                account_infos.extend(self.program_data.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for UpgradeAuthority<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.signer.to_account_metas(None));
                account_metas.extend(self.program_data.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for UpgradeAuthority<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.signer, program_id)
                    .map_err(|e| e.with_account_name("signer"))?;
                Ok(())
            }
        }
        pub struct UpgradeAuthorityBumps {
            pub program_data: u8,
        }
        #[automatically_derived]
        impl ::core::fmt::Debug for UpgradeAuthorityBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::debug_struct_field1_finish(
                    f,
                    "UpgradeAuthorityBumps",
                    "program_data",
                    &&self.program_data,
                )
            }
        }
        impl Default for UpgradeAuthorityBumps {
            fn default() -> Self {
                UpgradeAuthorityBumps {
                    program_data: u8::MAX,
                }
            }
        }
        impl<'info> anchor_lang::Bumps for UpgradeAuthority<'info>
        where
            'info: 'info,
        {
            type Bumps = UpgradeAuthorityBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_upgrade_authority {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`UpgradeAuthority`].
            pub struct UpgradeAuthority {
                pub signer: Pubkey,
                pub program_data: Pubkey,
            }
            impl borsh::ser::BorshSerialize for UpgradeAuthority
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.signer, writer)?;
                    borsh::BorshSerialize::serialize(&self.program_data, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for UpgradeAuthority {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.signer,
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.program_data,
                                false,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_upgrade_authority {
            use super::*;
            /// Generated CPI struct of the accounts for [`UpgradeAuthority`].
            pub struct UpgradeAuthority<'info> {
                pub signer: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub program_data: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for UpgradeAuthority<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.signer),
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.program_data),
                                false,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for UpgradeAuthority<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.signer),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.program_data,
                            ),
                        );
                    account_infos
                }
            }
        }
    }
    pub mod processor {
        pub mod register_ntt_config {
            use crate::config::access_control::*;
            use crate::config::state::ntt_config::{
                ExpectedNttConfig, EXPECTED_NTT_CONFIG_SEED,
            };
            use anchor_lang::prelude::*;
            use anchor_spl::token::Mint;
            pub struct RegisterNttConfig<'info> {
                pub upgrade_authority: UpgradeAuthority<'info>,
                pub mint: Account<'info, Mint>,
                #[account(
                    init_if_needed,
                    payer = upgrade_authority.signer,
                    space = ExpectedNttConfig::DISCRIMINATOR.len(

                    )+ExpectedNttConfig::INIT_SPACE,
                    seeds = [EXPECTED_NTT_CONFIG_SEED,
                    mint.key().as_ref()],
                    bump
                )]
                pub expected_ntt_config: Account<'info, ExpectedNttConfig>,
                /// CHECK: this is the address of the Ntt Manager program to register
                pub ntt_manager: UncheckedAccount<'info>,
                pub system_program: Program<'info, System>,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::Accounts<'info, RegisterNttConfigBumps>
            for RegisterNttConfig<'info>
            where
                'info: 'info,
            {
                #[inline(never)]
                fn try_accounts(
                    __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                    __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >],
                    __ix_data: &[u8],
                    __bumps: &mut RegisterNttConfigBumps,
                    __reallocs: &mut std::collections::BTreeSet<
                        anchor_lang::solana_program::pubkey::Pubkey,
                    >,
                ) -> anchor_lang::Result<Self> {
                    let upgrade_authority: UpgradeAuthority<'info> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        &mut __bumps.upgrade_authority,
                        __reallocs,
                    )?;
                    let mint: anchor_lang::accounts::account::Account<Mint> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("mint"))?;
                    if __accounts.is_empty() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into(),
                        );
                    }
                    let expected_ntt_config = &__accounts[0];
                    *__accounts = &__accounts[1..];
                    let ntt_manager: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("ntt_manager"))?;
                    let system_program: anchor_lang::accounts::program::Program<
                        System,
                    > = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("system_program"))?;
                    let __anchor_rent = Rent::get()?;
                    let (__pda_address, __bump) = Pubkey::find_program_address(
                        &[EXPECTED_NTT_CONFIG_SEED, mint.key().as_ref()],
                        __program_id,
                    );
                    __bumps.expected_ntt_config = __bump;
                    if expected_ntt_config.key() != __pda_address {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintSeeds,
                                )
                                .with_account_name("expected_ntt_config")
                                .with_pubkeys((expected_ntt_config.key(), __pda_address)),
                        );
                    }
                    let expected_ntt_config = ({
                        #[inline(never)]
                        || {
                            let actual_field = AsRef::<
                                AccountInfo,
                            >::as_ref(&expected_ntt_config);
                            let actual_owner = actual_field.owner;
                            let space = ExpectedNttConfig::DISCRIMINATOR.len()
                                + ExpectedNttConfig::INIT_SPACE;
                            let pa: anchor_lang::accounts::account::Account<
                                ExpectedNttConfig,
                            > = if !true
                                || actual_owner
                                    == &anchor_lang::solana_program::system_program::ID
                            {
                                let __current_lamports = expected_ntt_config.lamports();
                                if __current_lamports == 0 {
                                    let space = space;
                                    let lamports = __anchor_rent.minimum_balance(space);
                                    let cpi_accounts = anchor_lang::system_program::CreateAccount {
                                        from: upgrade_authority.signer.to_account_info(),
                                        to: expected_ntt_config.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::create_account(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        EXPECTED_NTT_CONFIG_SEED,
                                                        mint.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        lamports,
                                        space as u64,
                                        __program_id,
                                    )?;
                                } else {
                                    if upgrade_authority.signer.key()
                                        == expected_ntt_config.key()
                                    {
                                        return Err(
                                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                                    error_name: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .name(),
                                                    error_code_number: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .into(),
                                                    error_msg: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .to_string(),
                                                    error_origin: Some(
                                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                            filename: "programs/intent-transfer/src/config/processor/register_ntt_config.rs",
                                                            line: 6u32,
                                                        }),
                                                    ),
                                                    compared_values: None,
                                                })
                                                .with_pubkeys((
                                                    upgrade_authority.signer.key(),
                                                    expected_ntt_config.key(),
                                                )),
                                        );
                                    }
                                    let required_lamports = __anchor_rent
                                        .minimum_balance(space)
                                        .max(1)
                                        .saturating_sub(__current_lamports);
                                    if required_lamports > 0 {
                                        let cpi_accounts = anchor_lang::system_program::Transfer {
                                            from: upgrade_authority.signer.to_account_info(),
                                            to: expected_ntt_config.to_account_info(),
                                        };
                                        let cpi_context = anchor_lang::context::CpiContext::new(
                                            system_program.to_account_info(),
                                            cpi_accounts,
                                        );
                                        anchor_lang::system_program::transfer(
                                            cpi_context,
                                            required_lamports,
                                        )?;
                                    }
                                    let cpi_accounts = anchor_lang::system_program::Allocate {
                                        account_to_allocate: expected_ntt_config.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::allocate(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        EXPECTED_NTT_CONFIG_SEED,
                                                        mint.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        space as u64,
                                    )?;
                                    let cpi_accounts = anchor_lang::system_program::Assign {
                                        account_to_assign: expected_ntt_config.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::assign(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        EXPECTED_NTT_CONFIG_SEED,
                                                        mint.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        __program_id,
                                    )?;
                                }
                                match anchor_lang::accounts::account::Account::try_from_unchecked(
                                    &expected_ntt_config,
                                ) {
                                    Ok(val) => val,
                                    Err(e) => {
                                        return Err(e.with_account_name("expected_ntt_config"));
                                    }
                                }
                            } else {
                                match anchor_lang::accounts::account::Account::try_from(
                                    &expected_ntt_config,
                                ) {
                                    Ok(val) => val,
                                    Err(e) => {
                                        return Err(e.with_account_name("expected_ntt_config"));
                                    }
                                }
                            };
                            if true {
                                if space != actual_field.data_len() {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintSpace,
                                            )
                                            .with_account_name("expected_ntt_config")
                                            .with_values((space, actual_field.data_len())),
                                    );
                                }
                                if actual_owner != __program_id {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintOwner,
                                            )
                                            .with_account_name("expected_ntt_config")
                                            .with_pubkeys((*actual_owner, *__program_id)),
                                    );
                                }
                                {
                                    let required_lamports = __anchor_rent
                                        .minimum_balance(space);
                                    if pa.to_account_info().lamports() < required_lamports {
                                        return Err(
                                            anchor_lang::error::Error::from(
                                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                                )
                                                .with_account_name("expected_ntt_config"),
                                        );
                                    }
                                }
                            }
                            Ok(pa)
                        }
                    })()?;
                    if !AsRef::<AccountInfo>::as_ref(&expected_ntt_config).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("expected_ntt_config"),
                        );
                    }
                    if !__anchor_rent
                        .is_exempt(
                            expected_ntt_config.to_account_info().lamports(),
                            expected_ntt_config.to_account_info().try_data_len()?,
                        )
                    {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                )
                                .with_account_name("expected_ntt_config"),
                        );
                    }
                    Ok(RegisterNttConfig {
                        upgrade_authority,
                        mint,
                        expected_ntt_config,
                        ntt_manager,
                        system_program,
                    })
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for RegisterNttConfig<'info>
            where
                'info: 'info,
            {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos.extend(self.upgrade_authority.to_account_infos());
                    account_infos.extend(self.mint.to_account_infos());
                    account_infos.extend(self.expected_ntt_config.to_account_infos());
                    account_infos.extend(self.ntt_manager.to_account_infos());
                    account_infos.extend(self.system_program.to_account_infos());
                    account_infos
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for RegisterNttConfig<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas.extend(self.upgrade_authority.to_account_metas(None));
                    account_metas.extend(self.mint.to_account_metas(None));
                    account_metas
                        .extend(self.expected_ntt_config.to_account_metas(None));
                    account_metas.extend(self.ntt_manager.to_account_metas(None));
                    account_metas.extend(self.system_program.to_account_metas(None));
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::AccountsExit<'info> for RegisterNttConfig<'info>
            where
                'info: 'info,
            {
                fn exit(
                    &self,
                    program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                ) -> anchor_lang::Result<()> {
                    anchor_lang::AccountsExit::exit(&self.upgrade_authority, program_id)
                        .map_err(|e| e.with_account_name("upgrade_authority"))?;
                    anchor_lang::AccountsExit::exit(
                            &self.expected_ntt_config,
                            program_id,
                        )
                        .map_err(|e| e.with_account_name("expected_ntt_config"))?;
                    Ok(())
                }
            }
            pub struct RegisterNttConfigBumps {
                pub upgrade_authority: UpgradeAuthorityBumps,
                pub expected_ntt_config: u8,
            }
            #[automatically_derived]
            impl ::core::fmt::Debug for RegisterNttConfigBumps {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "RegisterNttConfigBumps",
                        "upgrade_authority",
                        &self.upgrade_authority,
                        "expected_ntt_config",
                        &&self.expected_ntt_config,
                    )
                }
            }
            impl Default for RegisterNttConfigBumps {
                fn default() -> Self {
                    RegisterNttConfigBumps {
                        upgrade_authority: UpgradeAuthorityBumps::default(),
                        expected_ntt_config: u8::MAX,
                    }
                }
            }
            impl<'info> anchor_lang::Bumps for RegisterNttConfig<'info>
            where
                'info: 'info,
            {
                type Bumps = RegisterNttConfigBumps;
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
            /// instead of an `AccountInfo`. This is useful for clients that want
            /// to generate a list of accounts, without explicitly knowing the
            /// order all the fields should be in.
            ///
            /// To access the struct in this module, one should use the sibling
            /// `accounts` module (also generated), which re-exports this.
            pub(crate) mod __client_accounts_register_ntt_config {
                use super::*;
                use anchor_lang::prelude::borsh;
                pub use __client_accounts_upgrade_authority::UpgradeAuthority;
                /// Generated client accounts for [`RegisterNttConfig`].
                pub struct RegisterNttConfig {
                    pub upgrade_authority: __client_accounts_upgrade_authority::UpgradeAuthority,
                    pub mint: Pubkey,
                    pub expected_ntt_config: Pubkey,
                    pub ntt_manager: Pubkey,
                    pub system_program: Pubkey,
                }
                impl borsh::ser::BorshSerialize for RegisterNttConfig
                where
                    __client_accounts_upgrade_authority::UpgradeAuthority: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                {
                    fn serialize<W: borsh::maybestd::io::Write>(
                        &self,
                        writer: &mut W,
                    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                        borsh::BorshSerialize::serialize(
                            &self.upgrade_authority,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.mint, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.expected_ntt_config,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.ntt_manager, writer)?;
                        borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                        Ok(())
                    }
                }
                #[automatically_derived]
                impl anchor_lang::ToAccountMetas for RegisterNttConfig {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .extend(self.upgrade_authority.to_account_metas(None));
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.mint,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.expected_ntt_config,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.ntt_manager,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.system_program,
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a CPI struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is an
            /// AccountInfo.
            ///
            /// To access the struct in this module, one should use the sibling
            /// [`cpi::accounts`] module (also generated), which re-exports this.
            pub(crate) mod __cpi_client_accounts_register_ntt_config {
                use super::*;
                pub use __cpi_client_accounts_upgrade_authority::UpgradeAuthority;
                /// Generated CPI struct of the accounts for [`RegisterNttConfig`].
                pub struct RegisterNttConfig<'info> {
                    pub upgrade_authority: __cpi_client_accounts_upgrade_authority::UpgradeAuthority<
                        'info,
                    >,
                    pub mint: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub expected_ntt_config: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub ntt_manager: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountMetas for RegisterNttConfig<'info> {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .extend(self.upgrade_authority.to_account_metas(None));
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.mint),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.expected_ntt_config),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.ntt_manager),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.system_program),
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountInfos<'info>
                for RegisterNttConfig<'info> {
                    fn to_account_infos(
                        &self,
                    ) -> Vec<
                        anchor_lang::solana_program::account_info::AccountInfo<'info>,
                    > {
                        let mut account_infos = ::alloc::vec::Vec::new();
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.upgrade_authority,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.mint),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.expected_ntt_config,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.ntt_manager,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.system_program,
                                ),
                            );
                        account_infos
                    }
                }
            }
            impl<'info> RegisterNttConfig<'info> {
                pub fn process(&mut self) -> Result<()> {
                    self.expected_ntt_config.manager = self.ntt_manager.key();
                    Ok(())
                }
            }
        }
        pub mod register_send_token_fee_config {
            use crate::config::access_control::*;
            use crate::config::state::send_token_fee_config::{
                SendTokenFeeConfig, SEND_TOKEN_FEE_CONFIG_SEED,
            };
            use anchor_lang::prelude::*;
            use anchor_spl::token::Mint;
            pub struct RegisterSendTokenFeeConfig<'info> {
                pub upgrade_authority: UpgradeAuthority<'info>,
                pub mint: Account<'info, Mint>,
                #[account(
                    init_if_needed,
                    payer = upgrade_authority.signer,
                    space = SendTokenFeeConfig::DISCRIMINATOR.len(

                    )+SendTokenFeeConfig::INIT_SPACE,
                    seeds = [SEND_TOKEN_FEE_CONFIG_SEED,
                    mint.key().as_ref()],
                    bump
                )]
                pub send_token_fee_config: Account<'info, SendTokenFeeConfig>,
                pub system_program: Program<'info, System>,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::Accounts<'info, RegisterSendTokenFeeConfigBumps>
            for RegisterSendTokenFeeConfig<'info>
            where
                'info: 'info,
            {
                #[inline(never)]
                fn try_accounts(
                    __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                    __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >],
                    __ix_data: &[u8],
                    __bumps: &mut RegisterSendTokenFeeConfigBumps,
                    __reallocs: &mut std::collections::BTreeSet<
                        anchor_lang::solana_program::pubkey::Pubkey,
                    >,
                ) -> anchor_lang::Result<Self> {
                    let upgrade_authority: UpgradeAuthority<'info> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        &mut __bumps.upgrade_authority,
                        __reallocs,
                    )?;
                    let mint: anchor_lang::accounts::account::Account<Mint> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("mint"))?;
                    if __accounts.is_empty() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into(),
                        );
                    }
                    let send_token_fee_config = &__accounts[0];
                    *__accounts = &__accounts[1..];
                    let system_program: anchor_lang::accounts::program::Program<
                        System,
                    > = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("system_program"))?;
                    let __anchor_rent = Rent::get()?;
                    let (__pda_address, __bump) = Pubkey::find_program_address(
                        &[SEND_TOKEN_FEE_CONFIG_SEED, mint.key().as_ref()],
                        __program_id,
                    );
                    __bumps.send_token_fee_config = __bump;
                    if send_token_fee_config.key() != __pda_address {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintSeeds,
                                )
                                .with_account_name("send_token_fee_config")
                                .with_pubkeys((send_token_fee_config.key(), __pda_address)),
                        );
                    }
                    let send_token_fee_config = ({
                        #[inline(never)]
                        || {
                            let actual_field = AsRef::<
                                AccountInfo,
                            >::as_ref(&send_token_fee_config);
                            let actual_owner = actual_field.owner;
                            let space = SendTokenFeeConfig::DISCRIMINATOR.len()
                                + SendTokenFeeConfig::INIT_SPACE;
                            let pa: anchor_lang::accounts::account::Account<
                                SendTokenFeeConfig,
                            > = if !true
                                || actual_owner
                                    == &anchor_lang::solana_program::system_program::ID
                            {
                                let __current_lamports = send_token_fee_config.lamports();
                                if __current_lamports == 0 {
                                    let space = space;
                                    let lamports = __anchor_rent.minimum_balance(space);
                                    let cpi_accounts = anchor_lang::system_program::CreateAccount {
                                        from: upgrade_authority.signer.to_account_info(),
                                        to: send_token_fee_config.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::create_account(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        SEND_TOKEN_FEE_CONFIG_SEED,
                                                        mint.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        lamports,
                                        space as u64,
                                        __program_id,
                                    )?;
                                } else {
                                    if upgrade_authority.signer.key()
                                        == send_token_fee_config.key()
                                    {
                                        return Err(
                                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                                    error_name: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .name(),
                                                    error_code_number: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .into(),
                                                    error_msg: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .to_string(),
                                                    error_origin: Some(
                                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                            filename: "programs/intent-transfer/src/config/processor/register_send_token_fee_config.rs",
                                                            line: 6u32,
                                                        }),
                                                    ),
                                                    compared_values: None,
                                                })
                                                .with_pubkeys((
                                                    upgrade_authority.signer.key(),
                                                    send_token_fee_config.key(),
                                                )),
                                        );
                                    }
                                    let required_lamports = __anchor_rent
                                        .minimum_balance(space)
                                        .max(1)
                                        .saturating_sub(__current_lamports);
                                    if required_lamports > 0 {
                                        let cpi_accounts = anchor_lang::system_program::Transfer {
                                            from: upgrade_authority.signer.to_account_info(),
                                            to: send_token_fee_config.to_account_info(),
                                        };
                                        let cpi_context = anchor_lang::context::CpiContext::new(
                                            system_program.to_account_info(),
                                            cpi_accounts,
                                        );
                                        anchor_lang::system_program::transfer(
                                            cpi_context,
                                            required_lamports,
                                        )?;
                                    }
                                    let cpi_accounts = anchor_lang::system_program::Allocate {
                                        account_to_allocate: send_token_fee_config.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::allocate(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        SEND_TOKEN_FEE_CONFIG_SEED,
                                                        mint.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        space as u64,
                                    )?;
                                    let cpi_accounts = anchor_lang::system_program::Assign {
                                        account_to_assign: send_token_fee_config.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::assign(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        SEND_TOKEN_FEE_CONFIG_SEED,
                                                        mint.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        __program_id,
                                    )?;
                                }
                                match anchor_lang::accounts::account::Account::try_from_unchecked(
                                    &send_token_fee_config,
                                ) {
                                    Ok(val) => val,
                                    Err(e) => {
                                        return Err(e.with_account_name("send_token_fee_config"));
                                    }
                                }
                            } else {
                                match anchor_lang::accounts::account::Account::try_from(
                                    &send_token_fee_config,
                                ) {
                                    Ok(val) => val,
                                    Err(e) => {
                                        return Err(e.with_account_name("send_token_fee_config"));
                                    }
                                }
                            };
                            if true {
                                if space != actual_field.data_len() {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintSpace,
                                            )
                                            .with_account_name("send_token_fee_config")
                                            .with_values((space, actual_field.data_len())),
                                    );
                                }
                                if actual_owner != __program_id {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintOwner,
                                            )
                                            .with_account_name("send_token_fee_config")
                                            .with_pubkeys((*actual_owner, *__program_id)),
                                    );
                                }
                                {
                                    let required_lamports = __anchor_rent
                                        .minimum_balance(space);
                                    if pa.to_account_info().lamports() < required_lamports {
                                        return Err(
                                            anchor_lang::error::Error::from(
                                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                                )
                                                .with_account_name("send_token_fee_config"),
                                        );
                                    }
                                }
                            }
                            Ok(pa)
                        }
                    })()?;
                    if !AsRef::<AccountInfo>::as_ref(&send_token_fee_config).is_writable
                    {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("send_token_fee_config"),
                        );
                    }
                    if !__anchor_rent
                        .is_exempt(
                            send_token_fee_config.to_account_info().lamports(),
                            send_token_fee_config.to_account_info().try_data_len()?,
                        )
                    {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                )
                                .with_account_name("send_token_fee_config"),
                        );
                    }
                    Ok(RegisterSendTokenFeeConfig {
                        upgrade_authority,
                        mint,
                        send_token_fee_config,
                        system_program,
                    })
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info>
            for RegisterSendTokenFeeConfig<'info>
            where
                'info: 'info,
            {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos.extend(self.upgrade_authority.to_account_infos());
                    account_infos.extend(self.mint.to_account_infos());
                    account_infos.extend(self.send_token_fee_config.to_account_infos());
                    account_infos.extend(self.system_program.to_account_infos());
                    account_infos
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas
            for RegisterSendTokenFeeConfig<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas.extend(self.upgrade_authority.to_account_metas(None));
                    account_metas.extend(self.mint.to_account_metas(None));
                    account_metas
                        .extend(self.send_token_fee_config.to_account_metas(None));
                    account_metas.extend(self.system_program.to_account_metas(None));
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::AccountsExit<'info>
            for RegisterSendTokenFeeConfig<'info>
            where
                'info: 'info,
            {
                fn exit(
                    &self,
                    program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                ) -> anchor_lang::Result<()> {
                    anchor_lang::AccountsExit::exit(&self.upgrade_authority, program_id)
                        .map_err(|e| e.with_account_name("upgrade_authority"))?;
                    anchor_lang::AccountsExit::exit(
                            &self.send_token_fee_config,
                            program_id,
                        )
                        .map_err(|e| e.with_account_name("send_token_fee_config"))?;
                    Ok(())
                }
            }
            pub struct RegisterSendTokenFeeConfigBumps {
                pub upgrade_authority: UpgradeAuthorityBumps,
                pub send_token_fee_config: u8,
            }
            #[automatically_derived]
            impl ::core::fmt::Debug for RegisterSendTokenFeeConfigBumps {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "RegisterSendTokenFeeConfigBumps",
                        "upgrade_authority",
                        &self.upgrade_authority,
                        "send_token_fee_config",
                        &&self.send_token_fee_config,
                    )
                }
            }
            impl Default for RegisterSendTokenFeeConfigBumps {
                fn default() -> Self {
                    RegisterSendTokenFeeConfigBumps {
                        upgrade_authority: UpgradeAuthorityBumps::default(),
                        send_token_fee_config: u8::MAX,
                    }
                }
            }
            impl<'info> anchor_lang::Bumps for RegisterSendTokenFeeConfig<'info>
            where
                'info: 'info,
            {
                type Bumps = RegisterSendTokenFeeConfigBumps;
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
            /// instead of an `AccountInfo`. This is useful for clients that want
            /// to generate a list of accounts, without explicitly knowing the
            /// order all the fields should be in.
            ///
            /// To access the struct in this module, one should use the sibling
            /// `accounts` module (also generated), which re-exports this.
            pub(crate) mod __client_accounts_register_send_token_fee_config {
                use super::*;
                use anchor_lang::prelude::borsh;
                pub use __client_accounts_upgrade_authority::UpgradeAuthority;
                /// Generated client accounts for [`RegisterSendTokenFeeConfig`].
                pub struct RegisterSendTokenFeeConfig {
                    pub upgrade_authority: __client_accounts_upgrade_authority::UpgradeAuthority,
                    pub mint: Pubkey,
                    pub send_token_fee_config: Pubkey,
                    pub system_program: Pubkey,
                }
                impl borsh::ser::BorshSerialize for RegisterSendTokenFeeConfig
                where
                    __client_accounts_upgrade_authority::UpgradeAuthority: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                {
                    fn serialize<W: borsh::maybestd::io::Write>(
                        &self,
                        writer: &mut W,
                    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                        borsh::BorshSerialize::serialize(
                            &self.upgrade_authority,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.mint, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.send_token_fee_config,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                        Ok(())
                    }
                }
                #[automatically_derived]
                impl anchor_lang::ToAccountMetas for RegisterSendTokenFeeConfig {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .extend(self.upgrade_authority.to_account_metas(None));
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.mint,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.send_token_fee_config,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.system_program,
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a CPI struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is an
            /// AccountInfo.
            ///
            /// To access the struct in this module, one should use the sibling
            /// [`cpi::accounts`] module (also generated), which re-exports this.
            pub(crate) mod __cpi_client_accounts_register_send_token_fee_config {
                use super::*;
                pub use __cpi_client_accounts_upgrade_authority::UpgradeAuthority;
                /// Generated CPI struct of the accounts for [`RegisterSendTokenFeeConfig`].
                pub struct RegisterSendTokenFeeConfig<'info> {
                    pub upgrade_authority: __cpi_client_accounts_upgrade_authority::UpgradeAuthority<
                        'info,
                    >,
                    pub mint: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub send_token_fee_config: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountMetas
                for RegisterSendTokenFeeConfig<'info> {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .extend(self.upgrade_authority.to_account_metas(None));
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.mint),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.send_token_fee_config),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.system_program),
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountInfos<'info>
                for RegisterSendTokenFeeConfig<'info> {
                    fn to_account_infos(
                        &self,
                    ) -> Vec<
                        anchor_lang::solana_program::account_info::AccountInfo<'info>,
                    > {
                        let mut account_infos = ::alloc::vec::Vec::new();
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.upgrade_authority,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.mint),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.send_token_fee_config,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.system_program,
                                ),
                            );
                        account_infos
                    }
                }
            }
            impl<'info> RegisterSendTokenFeeConfig<'info> {
                pub fn process(&mut self, ata_creation_fee: u64) -> Result<()> {
                    self.send_token_fee_config.ata_creation_fee = ata_creation_fee;
                    Ok(())
                }
            }
        }
    }
    pub mod state {
        pub mod ntt_config {
            use crate::error::IntentTransferError;
            use anchor_lang::prelude::*;
            pub const EXPECTED_NTT_CONFIG_SEED: &[u8] = b"expected_ntt_config";
            pub struct ExpectedNttConfig {
                pub manager: Pubkey,
            }
            #[automatically_derived]
            impl anchor_lang::Space for ExpectedNttConfig {
                const INIT_SPACE: usize = 0 + 32;
            }
            impl borsh::ser::BorshSerialize for ExpectedNttConfig
            where
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.manager, writer)?;
                    Ok(())
                }
            }
            impl borsh::de::BorshDeserialize for ExpectedNttConfig
            where
                Pubkey: borsh::BorshDeserialize,
            {
                fn deserialize_reader<R: borsh::maybestd::io::Read>(
                    reader: &mut R,
                ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                    Ok(Self {
                        manager: borsh::BorshDeserialize::deserialize_reader(reader)?,
                    })
                }
            }
            #[automatically_derived]
            impl ::core::clone::Clone for ExpectedNttConfig {
                #[inline]
                fn clone(&self) -> ExpectedNttConfig {
                    ExpectedNttConfig {
                        manager: ::core::clone::Clone::clone(&self.manager),
                    }
                }
            }
            #[automatically_derived]
            impl anchor_lang::AccountSerialize for ExpectedNttConfig {
                fn try_serialize<W: std::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> anchor_lang::Result<()> {
                    if writer.write_all(ExpectedNttConfig::DISCRIMINATOR).is_err() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountDidNotSerialize.into(),
                        );
                    }
                    if AnchorSerialize::serialize(self, writer).is_err() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountDidNotSerialize.into(),
                        );
                    }
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::AccountDeserialize for ExpectedNttConfig {
                fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
                    if buf.len() < ExpectedNttConfig::DISCRIMINATOR.len() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound
                                .into(),
                        );
                    }
                    let given_disc = &buf[..ExpectedNttConfig::DISCRIMINATOR.len()];
                    if ExpectedNttConfig::DISCRIMINATOR != given_disc {
                        return Err(
                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                    error_name: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                        .name(),
                                    error_code_number: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                        .into(),
                                    error_msg: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                        .to_string(),
                                    error_origin: Some(
                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                            filename: "programs/intent-transfer/src/config/state/ntt_config.rs",
                                            line: 6u32,
                                        }),
                                    ),
                                    compared_values: None,
                                })
                                .with_account_name("ExpectedNttConfig"),
                        );
                    }
                    Self::try_deserialize_unchecked(buf)
                }
                fn try_deserialize_unchecked(
                    buf: &mut &[u8],
                ) -> anchor_lang::Result<Self> {
                    let mut data: &[u8] = &buf[ExpectedNttConfig::DISCRIMINATOR.len()..];
                    AnchorDeserialize::deserialize(&mut data)
                        .map_err(|_| {
                            anchor_lang::error::ErrorCode::AccountDidNotDeserialize
                                .into()
                        })
                }
            }
            #[automatically_derived]
            impl anchor_lang::Discriminator for ExpectedNttConfig {
                const DISCRIMINATOR: &'static [u8] = &[
                    103,
                    57,
                    246,
                    175,
                    96,
                    78,
                    163,
                    60,
                ];
            }
            #[automatically_derived]
            impl anchor_lang::Owner for ExpectedNttConfig {
                fn owner() -> Pubkey {
                    crate::ID
                }
            }
            pub fn verify_ntt_manager(
                ntt_manager_key: Pubkey,
                expected_ntt_config: &Account<'_, ExpectedNttConfig>,
            ) -> Result<()> {
                if ntt_manager_key != expected_ntt_config.manager {
                    return Err(
                        anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                error_name: IntentTransferError::InvalidNttManager.name(),
                                error_code_number: IntentTransferError::InvalidNttManager
                                    .into(),
                                error_msg: IntentTransferError::InvalidNttManager
                                    .to_string(),
                                error_origin: Some(
                                    anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                        filename: "programs/intent-transfer/src/config/state/ntt_config.rs",
                                        line: 16u32,
                                    }),
                                ),
                                compared_values: None,
                            })
                            .with_pubkeys((ntt_manager_key, expected_ntt_config.manager)),
                    );
                }
                Ok(())
            }
        }
        pub mod send_token_fee_config {
            use anchor_lang::prelude::*;
            pub const SEND_TOKEN_FEE_CONFIG_SEED: &[u8] = b"send_token_fee_config";
            pub struct SendTokenFeeConfig {
                pub ata_creation_fee: u64,
            }
            #[automatically_derived]
            impl anchor_lang::Space for SendTokenFeeConfig {
                const INIT_SPACE: usize = 0 + 8;
            }
            impl borsh::ser::BorshSerialize for SendTokenFeeConfig
            where
                u64: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.ata_creation_fee, writer)?;
                    Ok(())
                }
            }
            impl borsh::de::BorshDeserialize for SendTokenFeeConfig
            where
                u64: borsh::BorshDeserialize,
            {
                fn deserialize_reader<R: borsh::maybestd::io::Read>(
                    reader: &mut R,
                ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                    Ok(Self {
                        ata_creation_fee: borsh::BorshDeserialize::deserialize_reader(
                            reader,
                        )?,
                    })
                }
            }
            #[automatically_derived]
            impl ::core::clone::Clone for SendTokenFeeConfig {
                #[inline]
                fn clone(&self) -> SendTokenFeeConfig {
                    SendTokenFeeConfig {
                        ata_creation_fee: ::core::clone::Clone::clone(
                            &self.ata_creation_fee,
                        ),
                    }
                }
            }
            #[automatically_derived]
            impl anchor_lang::AccountSerialize for SendTokenFeeConfig {
                fn try_serialize<W: std::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> anchor_lang::Result<()> {
                    if writer.write_all(SendTokenFeeConfig::DISCRIMINATOR).is_err() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountDidNotSerialize.into(),
                        );
                    }
                    if AnchorSerialize::serialize(self, writer).is_err() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountDidNotSerialize.into(),
                        );
                    }
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::AccountDeserialize for SendTokenFeeConfig {
                fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
                    if buf.len() < SendTokenFeeConfig::DISCRIMINATOR.len() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound
                                .into(),
                        );
                    }
                    let given_disc = &buf[..SendTokenFeeConfig::DISCRIMINATOR.len()];
                    if SendTokenFeeConfig::DISCRIMINATOR != given_disc {
                        return Err(
                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                    error_name: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                        .name(),
                                    error_code_number: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                        .into(),
                                    error_msg: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                        .to_string(),
                                    error_origin: Some(
                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                            filename: "programs/intent-transfer/src/config/state/send_token_fee_config.rs",
                                            line: 5u32,
                                        }),
                                    ),
                                    compared_values: None,
                                })
                                .with_account_name("SendTokenFeeConfig"),
                        );
                    }
                    Self::try_deserialize_unchecked(buf)
                }
                fn try_deserialize_unchecked(
                    buf: &mut &[u8],
                ) -> anchor_lang::Result<Self> {
                    let mut data: &[u8] = &buf[SendTokenFeeConfig::DISCRIMINATOR
                        .len()..];
                    AnchorDeserialize::deserialize(&mut data)
                        .map_err(|_| {
                            anchor_lang::error::ErrorCode::AccountDidNotDeserialize
                                .into()
                        })
                }
            }
            #[automatically_derived]
            impl anchor_lang::Discriminator for SendTokenFeeConfig {
                const DISCRIMINATOR: &'static [u8] = &[
                    102,
                    229,
                    21,
                    186,
                    113,
                    83,
                    132,
                    11,
                ];
            }
            #[automatically_derived]
            impl anchor_lang::Owner for SendTokenFeeConfig {
                fn owner() -> Pubkey {
                    crate::ID
                }
            }
        }
    }
}
mod error {
    use anchor_lang::prelude::*;
    use nom::error::Error;
    use nom::Err;
    use solana_intents::IntentError;
    #[repr(u32)]
    pub enum IntentTransferError {
        NoIntentMessageInstruction,
        IncorrectInstructionProgramId,
        SignatureVerificationUnexpectedHeader,
        ParseFailedError,
        DeserializeFailedError,
        ChainIdMismatch,
        SignerSourceMismatch,
        RecipientMismatch,
        MintMismatch,
        MetadataAccountRequired,
        MetadataAccountNotAllowed,
        MetadataMismatch,
        SymbolMismatch,
        NonceFailure,
        InvalidRecipientAddress,
        UnsupportedToChainId,
        InvalidNttManager,
        Unauthorized,
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for IntentTransferError {
        #[inline]
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            ::core::fmt::Formatter::write_str(
                f,
                match self {
                    IntentTransferError::NoIntentMessageInstruction => {
                        "NoIntentMessageInstruction"
                    }
                    IntentTransferError::IncorrectInstructionProgramId => {
                        "IncorrectInstructionProgramId"
                    }
                    IntentTransferError::SignatureVerificationUnexpectedHeader => {
                        "SignatureVerificationUnexpectedHeader"
                    }
                    IntentTransferError::ParseFailedError => "ParseFailedError",
                    IntentTransferError::DeserializeFailedError => {
                        "DeserializeFailedError"
                    }
                    IntentTransferError::ChainIdMismatch => "ChainIdMismatch",
                    IntentTransferError::SignerSourceMismatch => "SignerSourceMismatch",
                    IntentTransferError::RecipientMismatch => "RecipientMismatch",
                    IntentTransferError::MintMismatch => "MintMismatch",
                    IntentTransferError::MetadataAccountRequired => {
                        "MetadataAccountRequired"
                    }
                    IntentTransferError::MetadataAccountNotAllowed => {
                        "MetadataAccountNotAllowed"
                    }
                    IntentTransferError::MetadataMismatch => "MetadataMismatch",
                    IntentTransferError::SymbolMismatch => "SymbolMismatch",
                    IntentTransferError::NonceFailure => "NonceFailure",
                    IntentTransferError::InvalidRecipientAddress => {
                        "InvalidRecipientAddress"
                    }
                    IntentTransferError::UnsupportedToChainId => "UnsupportedToChainId",
                    IntentTransferError::InvalidNttManager => "InvalidNttManager",
                    IntentTransferError::Unauthorized => "Unauthorized",
                },
            )
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for IntentTransferError {
        #[inline]
        fn clone(&self) -> IntentTransferError {
            *self
        }
    }
    #[automatically_derived]
    impl ::core::marker::Copy for IntentTransferError {}
    impl IntentTransferError {
        /// Gets the name of this [#enum_name].
        pub fn name(&self) -> String {
            match self {
                IntentTransferError::NoIntentMessageInstruction => {
                    "NoIntentMessageInstruction".to_string()
                }
                IntentTransferError::IncorrectInstructionProgramId => {
                    "IncorrectInstructionProgramId".to_string()
                }
                IntentTransferError::SignatureVerificationUnexpectedHeader => {
                    "SignatureVerificationUnexpectedHeader".to_string()
                }
                IntentTransferError::ParseFailedError => "ParseFailedError".to_string(),
                IntentTransferError::DeserializeFailedError => {
                    "DeserializeFailedError".to_string()
                }
                IntentTransferError::ChainIdMismatch => "ChainIdMismatch".to_string(),
                IntentTransferError::SignerSourceMismatch => {
                    "SignerSourceMismatch".to_string()
                }
                IntentTransferError::RecipientMismatch => "RecipientMismatch".to_string(),
                IntentTransferError::MintMismatch => "MintMismatch".to_string(),
                IntentTransferError::MetadataAccountRequired => {
                    "MetadataAccountRequired".to_string()
                }
                IntentTransferError::MetadataAccountNotAllowed => {
                    "MetadataAccountNotAllowed".to_string()
                }
                IntentTransferError::MetadataMismatch => "MetadataMismatch".to_string(),
                IntentTransferError::SymbolMismatch => "SymbolMismatch".to_string(),
                IntentTransferError::NonceFailure => "NonceFailure".to_string(),
                IntentTransferError::InvalidRecipientAddress => {
                    "InvalidRecipientAddress".to_string()
                }
                IntentTransferError::UnsupportedToChainId => {
                    "UnsupportedToChainId".to_string()
                }
                IntentTransferError::InvalidNttManager => "InvalidNttManager".to_string(),
                IntentTransferError::Unauthorized => "Unauthorized".to_string(),
            }
        }
    }
    impl From<IntentTransferError> for u32 {
        fn from(e: IntentTransferError) -> u32 {
            e as u32 + anchor_lang::error::ERROR_CODE_OFFSET
        }
    }
    impl From<IntentTransferError> for anchor_lang::error::Error {
        fn from(error_code: IntentTransferError) -> anchor_lang::error::Error {
            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                error_name: error_code.name(),
                error_code_number: error_code.into(),
                error_msg: error_code.to_string(),
                error_origin: None,
                compared_values: None,
            })
        }
    }
    impl std::fmt::Display for IntentTransferError {
        fn fmt(
            &self,
            fmt: &mut std::fmt::Formatter<'_>,
        ) -> std::result::Result<(), std::fmt::Error> {
            match self {
                IntentTransferError::NoIntentMessageInstruction => {
                    fmt.write_fmt(
                        format_args!(
                            "This transaction is missing the required intent message instruction"
                        ),
                    )
                }
                IntentTransferError::IncorrectInstructionProgramId => {
                    fmt.write_fmt(
                        format_args!(
                            "The instruction preceding the intent transfer instruction is not an ed25519 instruction"
                        ),
                    )
                }
                IntentTransferError::SignatureVerificationUnexpectedHeader => {
                    fmt.write_fmt(
                        format_args!("The ed25519 instruction\'s header is incorrect"),
                    )
                }
                IntentTransferError::ParseFailedError => {
                    fmt.write_fmt(
                        format_args!(
                            "The intent message was malformed and could not be parsed"
                        ),
                    )
                }
                IntentTransferError::DeserializeFailedError => {
                    fmt.write_fmt(
                        format_args!(
                            "The borsh payload of the ed25519 instruction could not be deserialized"
                        ),
                    )
                }
                IntentTransferError::ChainIdMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "This blockchain\'s id doesn\'t match the chain id in the signed intent"
                        ),
                    )
                }
                IntentTransferError::SignerSourceMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The signer of the intent doesn\'t own the source ATA"
                        ),
                    )
                }
                IntentTransferError::RecipientMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The recipient account doesn\'t match the destination in the signed intent"
                        ),
                    )
                }
                IntentTransferError::MintMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The mint account doesn\'t match the mint in the signed intent"
                        ),
                    )
                }
                IntentTransferError::MetadataAccountRequired => {
                    fmt.write_fmt(
                        format_args!(
                            "The intent is using a symbol to reference the mint, but no metadata account was provided"
                        ),
                    )
                }
                IntentTransferError::MetadataAccountNotAllowed => {
                    fmt.write_fmt(
                        format_args!(
                            "A metadata account was provided but the intent is using a mint address"
                        ),
                    )
                }
                IntentTransferError::MetadataMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The metadata account provided is not the metadata account of the provided mint"
                        ),
                    )
                }
                IntentTransferError::SymbolMismatch => {
                    fmt.write_fmt(
                        format_args!(
                            "The symbol in the metadata account doesn\'t match the symbol in the signed intent"
                        ),
                    )
                }
                IntentTransferError::NonceFailure => {
                    fmt.write_fmt(
                        format_args!(
                            "The message\'s nonce is not one more than the previous nonce"
                        ),
                    )
                }
                IntentTransferError::InvalidRecipientAddress => {
                    fmt.write_fmt(
                        format_args!(
                            "The recipient address could not be parsed as a valid address"
                        ),
                    )
                }
                IntentTransferError::UnsupportedToChainId => {
                    fmt.write_fmt(
                        format_args!("The provided to chain ID is unsupported"),
                    )
                }
                IntentTransferError::InvalidNttManager => {
                    fmt.write_fmt(
                        format_args!(
                            "The provided Ntt manager for the given mint is invalid"
                        ),
                    )
                }
                IntentTransferError::Unauthorized => {
                    fmt.write_fmt(
                        format_args!(
                            "Unauthorized: only upgrade authority can call this"
                        ),
                    )
                }
            }
        }
    }
    type NomError = Err<Error<Vec<u8>>>;
    impl From<IntentError<NomError>> for IntentTransferError {
        fn from(err: IntentError<NomError>) -> Self {
            match err {
                IntentError::NoIntentMessageInstruction(_) => {
                    IntentTransferError::NoIntentMessageInstruction
                }
                IntentError::IncorrectInstructionProgramId => {
                    IntentTransferError::IncorrectInstructionProgramId
                }
                IntentError::SignatureVerificationUnexpectedHeader => {
                    IntentTransferError::SignatureVerificationUnexpectedHeader
                }
                IntentError::ParseFailedError(_) => IntentTransferError::ParseFailedError,
                IntentError::DeserializeFailedError(_) => {
                    IntentTransferError::DeserializeFailedError
                }
            }
        }
    }
}
mod intrachain {
    mod message {
        use anchor_lang::prelude::Pubkey;
        use nom::{
            bytes::complete::tag, character::complete::line_ending,
            combinator::{eof, map, verify},
            error::{Error, ParseError},
            sequence::delimited, AsChar, Compare, Err, IResult, Input, Offset, ParseTo,
            Parser,
        };
        use solana_intents::{tag_key_value, SymbolOrMint, Version};
        const MESSAGE_PREFIX: &str = "Fogo Transfer:\nSigning this intent will transfer the tokens as described below.\n";
        pub struct Message {
            pub version: Version,
            pub chain_id: String,
            pub symbol_or_mint: SymbolOrMint,
            pub amount: String,
            pub recipient: Pubkey,
            pub nonce: u64,
        }
        #[automatically_derived]
        impl ::core::fmt::Debug for Message {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                let names: &'static _ = &[
                    "version",
                    "chain_id",
                    "symbol_or_mint",
                    "amount",
                    "recipient",
                    "nonce",
                ];
                let values: &[&dyn ::core::fmt::Debug] = &[
                    &self.version,
                    &self.chain_id,
                    &self.symbol_or_mint,
                    &self.amount,
                    &self.recipient,
                    &&self.nonce,
                ];
                ::core::fmt::Formatter::debug_struct_fields_finish(
                    f,
                    "Message",
                    names,
                    values,
                )
            }
        }
        #[automatically_derived]
        impl ::core::marker::StructuralPartialEq for Message {}
        #[automatically_derived]
        impl ::core::cmp::PartialEq for Message {
            #[inline]
            fn eq(&self, other: &Message) -> bool {
                self.version == other.version && self.chain_id == other.chain_id
                    && self.symbol_or_mint == other.symbol_or_mint
                    && self.amount == other.amount && self.recipient == other.recipient
                    && self.nonce == other.nonce
            }
        }
        impl TryFrom<Vec<u8>> for Message {
            type Error = Err<Error<Vec<u8>>>;
            fn try_from(message: Vec<u8>) -> Result<Self, Self::Error> {
                match message_v0.parse(message.as_slice()) {
                    Ok((_, message)) => Ok(message),
                    Err(e) => Err(Err::<Error<&[u8]>>::to_owned(e)),
                }
            }
        }
        fn message_v0<I, E>(input: I) -> IResult<I, Message, E>
        where
            I: Input,
            I: ParseTo<String>,
            I: ParseTo<SymbolOrMint>,
            I: ParseTo<Version>,
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
                            verify(
                                tag_key_value("version"),
                                |version: &Version| {
                                    version.major == 0 && version.minor == 1
                                },
                            ),
                            tag_key_value("chain_id"),
                            tag_key_value("token"),
                            tag_key_value("amount"),
                            tag_key_value("recipient"),
                            tag_key_value("nonce"),
                        ),
                        eof,
                    ),
                    |(version, chain_id, symbol_or_mint, amount, recipient, nonce)| Message {
                        version,
                        chain_id,
                        symbol_or_mint,
                        amount,
                        recipient,
                        nonce,
                    },
                )
                .parse(input)
        }
    }
    pub mod processor {
        pub mod send_tokens {
            use crate::{
                error::IntentTransferError,
                intrachain::{message::Message, processor::NONCE_SEED},
                nonce::Nonce,
                verify::{
                    verify_and_update_nonce, verify_signer_matches_source,
                    verify_symbol_or_mint,
                },
                INTENT_TRANSFER_SEED,
            };
            use anchor_lang::{prelude::*, solana_program::sysvar::instructions};
            use anchor_spl::token::{
                spl_token::try_ui_amount_into_amount, transfer_checked, Mint, Token,
                TokenAccount, TransferChecked,
            };
            use anchor_lang::error::ErrorCode;
            use chain_id::ChainId;
            use solana_intents::Intent;
            pub struct SendTokens<'info> {
                #[account(seeds = [chain_id::SEED], seeds::program = chain_id::ID, bump)]
                pub chain_id: Account<'info, ChainId>,
                /// CHECK: we check the address of this account
                #[account(address = instructions::ID)]
                pub sysvar_instructions: UncheckedAccount<'info>,
                /// CHECK: this is just a signer for token program CPIs
                #[account(seeds = [INTENT_TRANSFER_SEED], bump)]
                pub intent_transfer_setter: UncheckedAccount<'info>,
                pub token_program: Program<'info, Token>,
                #[account(mut, token::mint = mint)]
                pub source: Account<'info, TokenAccount>,
                /// CHECK: this account might be unitialized in the case of `send_tokens_with_fee` but it is checked after initialization in `SendTokens::verify_and_send`
                pub destination: UncheckedAccount<'info>,
                pub mint: Account<'info, Mint>,
                pub metadata: Option<UncheckedAccount<'info>>,
                #[account(
                    init_if_needed,
                    payer = sponsor,
                    space = Nonce::DISCRIMINATOR.len()+Nonce::INIT_SPACE,
                    seeds = [NONCE_SEED,
                    source.owner.key().as_ref()],
                    bump
                )]
                pub nonce: Account<'info, Nonce>,
                #[account(mut)]
                pub sponsor: Signer<'info>,
                pub system_program: Program<'info, System>,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::Accounts<'info, SendTokensBumps>
            for SendTokens<'info>
            where
                'info: 'info,
            {
                #[inline(never)]
                fn try_accounts(
                    __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                    __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >],
                    __ix_data: &[u8],
                    __bumps: &mut SendTokensBumps,
                    __reallocs: &mut std::collections::BTreeSet<
                        anchor_lang::solana_program::pubkey::Pubkey,
                    >,
                ) -> anchor_lang::Result<Self> {
                    let chain_id: anchor_lang::accounts::account::Account<ChainId> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("chain_id"))?;
                    let sysvar_instructions: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("sysvar_instructions"))?;
                    let intent_transfer_setter: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("intent_transfer_setter"))?;
                    let token_program: anchor_lang::accounts::program::Program<Token> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("token_program"))?;
                    let source: anchor_lang::accounts::account::Account<TokenAccount> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("source"))?;
                    let destination: UncheckedAccount = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("destination"))?;
                    let mint: anchor_lang::accounts::account::Account<Mint> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("mint"))?;
                    let metadata: Option<UncheckedAccount> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("metadata"))?;
                    if __accounts.is_empty() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into(),
                        );
                    }
                    let nonce = &__accounts[0];
                    *__accounts = &__accounts[1..];
                    let sponsor: Signer = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("sponsor"))?;
                    let system_program: anchor_lang::accounts::program::Program<
                        System,
                    > = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("system_program"))?;
                    let __anchor_rent = Rent::get()?;
                    let (__pda_address, __bump) = Pubkey::find_program_address(
                        &[NONCE_SEED, source.owner.key().as_ref()],
                        __program_id,
                    );
                    __bumps.nonce = __bump;
                    if nonce.key() != __pda_address {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintSeeds,
                                )
                                .with_account_name("nonce")
                                .with_pubkeys((nonce.key(), __pda_address)),
                        );
                    }
                    let nonce = ({
                        #[inline(never)]
                        || {
                            let actual_field = AsRef::<AccountInfo>::as_ref(&nonce);
                            let actual_owner = actual_field.owner;
                            let space = Nonce::DISCRIMINATOR.len() + Nonce::INIT_SPACE;
                            let pa: anchor_lang::accounts::account::Account<Nonce> = if !true
                                || actual_owner
                                    == &anchor_lang::solana_program::system_program::ID
                            {
                                let __current_lamports = nonce.lamports();
                                if __current_lamports == 0 {
                                    let space = space;
                                    let lamports = __anchor_rent.minimum_balance(space);
                                    let cpi_accounts = anchor_lang::system_program::CreateAccount {
                                        from: sponsor.to_account_info(),
                                        to: nonce.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::create_account(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        NONCE_SEED,
                                                        source.owner.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        lamports,
                                        space as u64,
                                        __program_id,
                                    )?;
                                } else {
                                    if sponsor.key() == nonce.key() {
                                        return Err(
                                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                                    error_name: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .name(),
                                                    error_code_number: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .into(),
                                                    error_msg: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                                        .to_string(),
                                                    error_origin: Some(
                                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                            filename: "programs/intent-transfer/src/intrachain/processor/send_tokens.rs",
                                                            line: 17u32,
                                                        }),
                                                    ),
                                                    compared_values: None,
                                                })
                                                .with_pubkeys((sponsor.key(), nonce.key())),
                                        );
                                    }
                                    let required_lamports = __anchor_rent
                                        .minimum_balance(space)
                                        .max(1)
                                        .saturating_sub(__current_lamports);
                                    if required_lamports > 0 {
                                        let cpi_accounts = anchor_lang::system_program::Transfer {
                                            from: sponsor.to_account_info(),
                                            to: nonce.to_account_info(),
                                        };
                                        let cpi_context = anchor_lang::context::CpiContext::new(
                                            system_program.to_account_info(),
                                            cpi_accounts,
                                        );
                                        anchor_lang::system_program::transfer(
                                            cpi_context,
                                            required_lamports,
                                        )?;
                                    }
                                    let cpi_accounts = anchor_lang::system_program::Allocate {
                                        account_to_allocate: nonce.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::allocate(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        NONCE_SEED,
                                                        source.owner.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        space as u64,
                                    )?;
                                    let cpi_accounts = anchor_lang::system_program::Assign {
                                        account_to_assign: nonce.to_account_info(),
                                    };
                                    let cpi_context = anchor_lang::context::CpiContext::new(
                                        system_program.to_account_info(),
                                        cpi_accounts,
                                    );
                                    anchor_lang::system_program::assign(
                                        cpi_context
                                            .with_signer(
                                                &[
                                                    &[
                                                        NONCE_SEED,
                                                        source.owner.key().as_ref(),
                                                        &[__bump][..],
                                                    ][..],
                                                ],
                                            ),
                                        __program_id,
                                    )?;
                                }
                                match anchor_lang::accounts::account::Account::try_from_unchecked(
                                    &nonce,
                                ) {
                                    Ok(val) => val,
                                    Err(e) => return Err(e.with_account_name("nonce")),
                                }
                            } else {
                                match anchor_lang::accounts::account::Account::try_from(
                                    &nonce,
                                ) {
                                    Ok(val) => val,
                                    Err(e) => return Err(e.with_account_name("nonce")),
                                }
                            };
                            if true {
                                if space != actual_field.data_len() {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintSpace,
                                            )
                                            .with_account_name("nonce")
                                            .with_values((space, actual_field.data_len())),
                                    );
                                }
                                if actual_owner != __program_id {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintOwner,
                                            )
                                            .with_account_name("nonce")
                                            .with_pubkeys((*actual_owner, *__program_id)),
                                    );
                                }
                                {
                                    let required_lamports = __anchor_rent
                                        .minimum_balance(space);
                                    if pa.to_account_info().lamports() < required_lamports {
                                        return Err(
                                            anchor_lang::error::Error::from(
                                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                                )
                                                .with_account_name("nonce"),
                                        );
                                    }
                                }
                            }
                            Ok(pa)
                        }
                    })()?;
                    if !AsRef::<AccountInfo>::as_ref(&nonce).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("nonce"),
                        );
                    }
                    if !__anchor_rent
                        .is_exempt(
                            nonce.to_account_info().lamports(),
                            nonce.to_account_info().try_data_len()?,
                        )
                    {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                )
                                .with_account_name("nonce"),
                        );
                    }
                    let (__pda_address, __bump) = Pubkey::find_program_address(
                        &[chain_id::SEED],
                        &chain_id::ID.key(),
                    );
                    __bumps.chain_id = __bump;
                    if chain_id.key() != __pda_address {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintSeeds,
                                )
                                .with_account_name("chain_id")
                                .with_pubkeys((chain_id.key(), __pda_address)),
                        );
                    }
                    {
                        let actual = sysvar_instructions.key();
                        let expected = instructions::ID;
                        if actual != expected {
                            return Err(
                                anchor_lang::error::Error::from(
                                        anchor_lang::error::ErrorCode::ConstraintAddress,
                                    )
                                    .with_account_name("sysvar_instructions")
                                    .with_pubkeys((actual, expected)),
                            );
                        }
                    }
                    let (__pda_address, __bump) = Pubkey::find_program_address(
                        &[INTENT_TRANSFER_SEED],
                        &__program_id,
                    );
                    __bumps.intent_transfer_setter = __bump;
                    if intent_transfer_setter.key() != __pda_address {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintSeeds,
                                )
                                .with_account_name("intent_transfer_setter")
                                .with_pubkeys((intent_transfer_setter.key(), __pda_address)),
                        );
                    }
                    if !AsRef::<AccountInfo>::as_ref(&source).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("source"),
                        );
                    }
                    {
                        if source.mint != mint.key() {
                            return Err(
                                anchor_lang::error::ErrorCode::ConstraintTokenMint.into(),
                            );
                        }
                    }
                    if !AsRef::<AccountInfo>::as_ref(&sponsor).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("sponsor"),
                        );
                    }
                    Ok(SendTokens {
                        chain_id,
                        sysvar_instructions,
                        intent_transfer_setter,
                        token_program,
                        source,
                        destination,
                        mint,
                        metadata,
                        nonce,
                        sponsor,
                        system_program,
                    })
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for SendTokens<'info>
            where
                'info: 'info,
            {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos.extend(self.chain_id.to_account_infos());
                    account_infos.extend(self.sysvar_instructions.to_account_infos());
                    account_infos.extend(self.intent_transfer_setter.to_account_infos());
                    account_infos.extend(self.token_program.to_account_infos());
                    account_infos.extend(self.source.to_account_infos());
                    account_infos.extend(self.destination.to_account_infos());
                    account_infos.extend(self.mint.to_account_infos());
                    account_infos.extend(self.metadata.to_account_infos());
                    account_infos.extend(self.nonce.to_account_infos());
                    account_infos.extend(self.sponsor.to_account_infos());
                    account_infos.extend(self.system_program.to_account_infos());
                    account_infos
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for SendTokens<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas.extend(self.chain_id.to_account_metas(None));
                    account_metas
                        .extend(self.sysvar_instructions.to_account_metas(None));
                    account_metas
                        .extend(self.intent_transfer_setter.to_account_metas(None));
                    account_metas.extend(self.token_program.to_account_metas(None));
                    account_metas.extend(self.source.to_account_metas(None));
                    account_metas.extend(self.destination.to_account_metas(None));
                    account_metas.extend(self.mint.to_account_metas(None));
                    if let Some(metadata) = &self.metadata {
                        account_metas.extend(metadata.to_account_metas(None));
                    } else {
                        account_metas.push(AccountMeta::new_readonly(crate::ID, false));
                    }
                    account_metas.extend(self.nonce.to_account_metas(None));
                    account_metas.extend(self.sponsor.to_account_metas(None));
                    account_metas.extend(self.system_program.to_account_metas(None));
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::AccountsExit<'info> for SendTokens<'info>
            where
                'info: 'info,
            {
                fn exit(
                    &self,
                    program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                ) -> anchor_lang::Result<()> {
                    anchor_lang::AccountsExit::exit(&self.source, program_id)
                        .map_err(|e| e.with_account_name("source"))?;
                    anchor_lang::AccountsExit::exit(&self.nonce, program_id)
                        .map_err(|e| e.with_account_name("nonce"))?;
                    anchor_lang::AccountsExit::exit(&self.sponsor, program_id)
                        .map_err(|e| e.with_account_name("sponsor"))?;
                    Ok(())
                }
            }
            pub struct SendTokensBumps {
                pub chain_id: u8,
                pub intent_transfer_setter: u8,
                pub nonce: u8,
            }
            #[automatically_derived]
            impl ::core::fmt::Debug for SendTokensBumps {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::debug_struct_field3_finish(
                        f,
                        "SendTokensBumps",
                        "chain_id",
                        &self.chain_id,
                        "intent_transfer_setter",
                        &self.intent_transfer_setter,
                        "nonce",
                        &&self.nonce,
                    )
                }
            }
            impl Default for SendTokensBumps {
                fn default() -> Self {
                    SendTokensBumps {
                        chain_id: u8::MAX,
                        intent_transfer_setter: u8::MAX,
                        nonce: u8::MAX,
                    }
                }
            }
            impl<'info> anchor_lang::Bumps for SendTokens<'info>
            where
                'info: 'info,
            {
                type Bumps = SendTokensBumps;
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
            /// instead of an `AccountInfo`. This is useful for clients that want
            /// to generate a list of accounts, without explicitly knowing the
            /// order all the fields should be in.
            ///
            /// To access the struct in this module, one should use the sibling
            /// `accounts` module (also generated), which re-exports this.
            pub(crate) mod __client_accounts_send_tokens {
                use super::*;
                use anchor_lang::prelude::borsh;
                /// Generated client accounts for [`SendTokens`].
                pub struct SendTokens {
                    pub chain_id: Pubkey,
                    pub sysvar_instructions: Pubkey,
                    pub intent_transfer_setter: Pubkey,
                    pub token_program: Pubkey,
                    pub source: Pubkey,
                    pub destination: Pubkey,
                    pub mint: Pubkey,
                    pub metadata: Option<Pubkey>,
                    pub nonce: Pubkey,
                    pub sponsor: Pubkey,
                    pub system_program: Pubkey,
                }
                impl borsh::ser::BorshSerialize for SendTokens
                where
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Option<Pubkey>: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                {
                    fn serialize<W: borsh::maybestd::io::Write>(
                        &self,
                        writer: &mut W,
                    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                        borsh::BorshSerialize::serialize(&self.chain_id, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.sysvar_instructions,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.intent_transfer_setter,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.token_program, writer)?;
                        borsh::BorshSerialize::serialize(&self.source, writer)?;
                        borsh::BorshSerialize::serialize(&self.destination, writer)?;
                        borsh::BorshSerialize::serialize(&self.mint, writer)?;
                        borsh::BorshSerialize::serialize(&self.metadata, writer)?;
                        borsh::BorshSerialize::serialize(&self.nonce, writer)?;
                        borsh::BorshSerialize::serialize(&self.sponsor, writer)?;
                        borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                        Ok(())
                    }
                }
                #[automatically_derived]
                impl anchor_lang::ToAccountMetas for SendTokens {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.chain_id,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.sysvar_instructions,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.intent_transfer_setter,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.token_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.source,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.destination,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.mint,
                                    false,
                                ),
                            );
                        if let Some(metadata) = &self.metadata {
                            account_metas
                                .push(
                                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                        *metadata,
                                        false,
                                    ),
                                );
                        } else {
                            account_metas
                                .push(
                                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                        crate::ID,
                                        false,
                                    ),
                                );
                        }
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.nonce,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.sponsor,
                                    true,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.system_program,
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a CPI struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is an
            /// AccountInfo.
            ///
            /// To access the struct in this module, one should use the sibling
            /// [`cpi::accounts`] module (also generated), which re-exports this.
            pub(crate) mod __cpi_client_accounts_send_tokens {
                use super::*;
                /// Generated CPI struct of the accounts for [`SendTokens`].
                pub struct SendTokens<'info> {
                    pub chain_id: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub sysvar_instructions: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub intent_transfer_setter: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub source: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub destination: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub mint: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub metadata: Option<
                        anchor_lang::solana_program::account_info::AccountInfo<'info>,
                    >,
                    pub nonce: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub sponsor: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountMetas for SendTokens<'info> {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.chain_id),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.sysvar_instructions),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.intent_transfer_setter),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.token_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.source),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.destination),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.mint),
                                    false,
                                ),
                            );
                        if let Some(metadata) = &self.metadata {
                            account_metas
                                .push(
                                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                        anchor_lang::Key::key(metadata),
                                        false,
                                    ),
                                );
                        } else {
                            account_metas
                                .push(
                                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                        crate::ID,
                                        false,
                                    ),
                                );
                        }
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.nonce),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.sponsor),
                                    true,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.system_program),
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountInfos<'info> for SendTokens<'info> {
                    fn to_account_infos(
                        &self,
                    ) -> Vec<
                        anchor_lang::solana_program::account_info::AccountInfo<'info>,
                    > {
                        let mut account_infos = ::alloc::vec::Vec::new();
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.chain_id,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.sysvar_instructions,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.intent_transfer_setter,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.token_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.source),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.destination,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.mint),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.metadata,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.nonce),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(&self.sponsor),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.system_program,
                                ),
                            );
                        account_infos
                    }
                }
            }
            impl<'info> SendTokens<'info> {
                pub fn verify_and_send(
                    &mut self,
                    signer_seeds: &[&[&[u8]]],
                ) -> Result<()> {
                    let destination_account_data = TokenAccount::try_deserialize(
                        &mut self.destination.data.borrow().as_ref(),
                    )?;
                    if destination_account_data.mint != self.mint.key() {
                        return Err(
                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                    error_name: ErrorCode::ConstraintTokenMint.name(),
                                    error_code_number: ErrorCode::ConstraintTokenMint.into(),
                                    error_msg: ErrorCode::ConstraintTokenMint.to_string(),
                                    error_origin: Some(
                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                            filename: "programs/intent-transfer/src/intrachain/processor/send_tokens.rs",
                                            line: 60u32,
                                        }),
                                    ),
                                    compared_values: None,
                                })
                                .with_values((
                                    destination_account_data.mint,
                                    self.mint.key(),
                                )),
                        );
                    }
                    let Self {
                        chain_id,
                        destination,
                        intent_transfer_setter,
                        metadata,
                        mint,
                        source,
                        sysvar_instructions,
                        token_program,
                        nonce,
                        sponsor: _,
                        system_program: _,
                    } = self;
                    let Intent {
                        message: Message {
                            amount,
                            chain_id: expected_chain_id,
                            recipient,
                            symbol_or_mint,
                            nonce: new_nonce,
                            version: _,
                        },
                        signer,
                    } = Intent::load(sysvar_instructions.as_ref())
                        .map_err(Into::<IntentTransferError>::into)?;
                    if chain_id.chain_id != expected_chain_id {
                        return Err(
                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                error_name: IntentTransferError::ChainIdMismatch.name(),
                                error_code_number: IntentTransferError::ChainIdMismatch
                                    .into(),
                                error_msg: IntentTransferError::ChainIdMismatch.to_string(),
                                error_origin: Some(
                                    anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                        filename: "programs/intent-transfer/src/intrachain/processor/send_tokens.rs",
                                        line: 89u32,
                                    }),
                                ),
                                compared_values: None,
                            }),
                        );
                    }
                    verify_symbol_or_mint(&symbol_or_mint, metadata, mint)?;
                    verify_signer_matches_source(signer, source.owner)?;
                    if recipient != destination_account_data.owner {
                        return Err(
                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                    error_name: IntentTransferError::RecipientMismatch.name(),
                                    error_code_number: IntentTransferError::RecipientMismatch
                                        .into(),
                                    error_msg: IntentTransferError::RecipientMismatch
                                        .to_string(),
                                    error_origin: Some(
                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                            filename: "programs/intent-transfer/src/intrachain/processor/send_tokens.rs",
                                            line: 95u32,
                                        }),
                                    ),
                                    compared_values: None,
                                })
                                .with_pubkeys((recipient, destination_account_data.owner)),
                        );
                    }
                    verify_and_update_nonce(nonce, new_nonce)?;
                    transfer_checked(
                        CpiContext::new_with_signer(
                            token_program.to_account_info(),
                            TransferChecked {
                                authority: intent_transfer_setter.to_account_info(),
                                from: source.to_account_info(),
                                mint: mint.to_account_info(),
                                to: destination.to_account_info(),
                            },
                            signer_seeds,
                        ),
                        try_ui_amount_into_amount(amount, mint.decimals)?,
                        mint.decimals,
                    )?;
                    Ok(())
                }
            }
        }
        pub mod send_tokens_with_fee {
            use crate::{
                config::state::send_token_fee_config::{
                    SendTokenFeeConfig, SEND_TOKEN_FEE_CONFIG_SEED,
                },
                intrachain::processor::send_tokens::*,
            };
            use anchor_lang::prelude::*;
            use anchor_spl::token::{transfer_checked, TransferChecked};
            use anchor_spl::{
                associated_token::{self, AssociatedToken},
                token::{Mint, Token, TokenAccount},
            };
            use anchor_spl::associated_token::get_associated_token_address;
            pub struct SendTokensWithFee<'info> {
                pub send_tokens: SendTokens<'info>,
                #[account(
                    mut,
                    token::mint = fee_mint,
                    token::authority = send_tokens.source.owner
                )]
                pub fee_source: Account<'info, TokenAccount>,
                #[account(
                    init_if_needed,
                    payer = send_tokens.sponsor,
                    associated_token::mint = fee_mint,
                    associated_token::authority = send_tokens.sponsor
                )]
                pub fee_destination: Account<'info, TokenAccount>,
                pub fee_mint: Account<'info, Mint>,
                #[account(
                    seeds = [SEND_TOKEN_FEE_CONFIG_SEED,
                    fee_mint.key().as_ref()],
                    bump
                )]
                pub send_token_fee_config: Account<'info, SendTokenFeeConfig>,
                /// CHECK: This account is only used and checked against `destination` in the `create_destination_account_and_collect_fee` when the `destination` account is not yet initialized
                pub destination_owner: AccountInfo<'info>,
                pub associated_token_program: Program<'info, AssociatedToken>,
                pub token_program: Program<'info, Token>,
                pub system_program: Program<'info, System>,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::Accounts<'info, SendTokensWithFeeBumps>
            for SendTokensWithFee<'info>
            where
                'info: 'info,
            {
                #[inline(never)]
                fn try_accounts(
                    __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                    __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >],
                    __ix_data: &[u8],
                    __bumps: &mut SendTokensWithFeeBumps,
                    __reallocs: &mut std::collections::BTreeSet<
                        anchor_lang::solana_program::pubkey::Pubkey,
                    >,
                ) -> anchor_lang::Result<Self> {
                    let send_tokens: SendTokens<'info> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        &mut __bumps.send_tokens,
                        __reallocs,
                    )?;
                    let fee_source: anchor_lang::accounts::account::Account<
                        TokenAccount,
                    > = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("fee_source"))?;
                    if __accounts.is_empty() {
                        return Err(
                            anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into(),
                        );
                    }
                    let fee_destination = &__accounts[0];
                    *__accounts = &__accounts[1..];
                    let fee_mint: anchor_lang::accounts::account::Account<Mint> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("fee_mint"))?;
                    let send_token_fee_config: anchor_lang::accounts::account::Account<
                        SendTokenFeeConfig,
                    > = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("send_token_fee_config"))?;
                    let destination_owner: AccountInfo = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("destination_owner"))?;
                    let associated_token_program: anchor_lang::accounts::program::Program<
                        AssociatedToken,
                    > = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("associated_token_program"))?;
                    let token_program: anchor_lang::accounts::program::Program<Token> = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("token_program"))?;
                    let system_program: anchor_lang::accounts::program::Program<
                        System,
                    > = anchor_lang::Accounts::try_accounts(
                            __program_id,
                            __accounts,
                            __ix_data,
                            __bumps,
                            __reallocs,
                        )
                        .map_err(|e| e.with_account_name("system_program"))?;
                    let __anchor_rent = Rent::get()?;
                    let fee_destination: anchor_lang::accounts::account::Account<
                        TokenAccount,
                    > = ({
                        #[inline(never)]
                        || {
                            let owner_program = AsRef::<
                                AccountInfo,
                            >::as_ref(&fee_destination)
                                .owner;
                            if !true
                                || owner_program
                                    == &anchor_lang::solana_program::system_program::ID
                            {
                                ::anchor_spl::associated_token::create(
                                    anchor_lang::context::CpiContext::new(
                                        associated_token_program.to_account_info(),
                                        ::anchor_spl::associated_token::Create {
                                            payer: send_tokens.sponsor.to_account_info(),
                                            associated_token: fee_destination.to_account_info(),
                                            authority: send_tokens.sponsor.to_account_info(),
                                            mint: fee_mint.to_account_info(),
                                            system_program: system_program.to_account_info(),
                                            token_program: token_program.to_account_info(),
                                        },
                                    ),
                                )?;
                            }
                            let pa: anchor_lang::accounts::account::Account<
                                TokenAccount,
                            > = match anchor_lang::accounts::account::Account::try_from_unchecked(
                                &fee_destination,
                            ) {
                                Ok(val) => val,
                                Err(e) => return Err(e.with_account_name("fee_destination")),
                            };
                            if true {
                                if pa.mint != fee_mint.key() {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintTokenMint,
                                            )
                                            .with_account_name("fee_destination")
                                            .with_pubkeys((pa.mint, fee_mint.key())),
                                    );
                                }
                                if pa.owner != send_tokens.sponsor.key() {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintTokenOwner,
                                            )
                                            .with_account_name("fee_destination")
                                            .with_pubkeys((pa.owner, send_tokens.sponsor.key())),
                                    );
                                }
                                if owner_program != &token_program.key() {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::ConstraintAssociatedTokenTokenProgram,
                                            )
                                            .with_account_name("fee_destination")
                                            .with_pubkeys((*owner_program, token_program.key())),
                                    );
                                }
                                if pa.key()
                                    != ::anchor_spl::associated_token::get_associated_token_address_with_program_id(
                                        &send_tokens.sponsor.key(),
                                        &fee_mint.key(),
                                        &token_program.key(),
                                    )
                                {
                                    return Err(
                                        anchor_lang::error::Error::from(
                                                anchor_lang::error::ErrorCode::AccountNotAssociatedTokenAccount,
                                            )
                                            .with_account_name("fee_destination"),
                                    );
                                }
                            }
                            Ok(pa)
                        }
                    })()?;
                    if !AsRef::<AccountInfo>::as_ref(&fee_destination).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("fee_destination"),
                        );
                    }
                    if !__anchor_rent
                        .is_exempt(
                            fee_destination.to_account_info().lamports(),
                            fee_destination.to_account_info().try_data_len()?,
                        )
                    {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                )
                                .with_account_name("fee_destination"),
                        );
                    }
                    if !AsRef::<AccountInfo>::as_ref(&fee_source).is_writable {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintMut,
                                )
                                .with_account_name("fee_source"),
                        );
                    }
                    {
                        if fee_source.owner != send_tokens.source.owner.key() {
                            return Err(
                                anchor_lang::error::ErrorCode::ConstraintTokenOwner.into(),
                            );
                        }
                        if fee_source.mint != fee_mint.key() {
                            return Err(
                                anchor_lang::error::ErrorCode::ConstraintTokenMint.into(),
                            );
                        }
                    }
                    let (__pda_address, __bump) = Pubkey::find_program_address(
                        &[SEND_TOKEN_FEE_CONFIG_SEED, fee_mint.key().as_ref()],
                        &__program_id,
                    );
                    __bumps.send_token_fee_config = __bump;
                    if send_token_fee_config.key() != __pda_address {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintSeeds,
                                )
                                .with_account_name("send_token_fee_config")
                                .with_pubkeys((send_token_fee_config.key(), __pda_address)),
                        );
                    }
                    Ok(SendTokensWithFee {
                        send_tokens,
                        fee_source,
                        fee_destination,
                        fee_mint,
                        send_token_fee_config,
                        destination_owner,
                        associated_token_program,
                        token_program,
                        system_program,
                    })
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for SendTokensWithFee<'info>
            where
                'info: 'info,
            {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos.extend(self.send_tokens.to_account_infos());
                    account_infos.extend(self.fee_source.to_account_infos());
                    account_infos.extend(self.fee_destination.to_account_infos());
                    account_infos.extend(self.fee_mint.to_account_infos());
                    account_infos.extend(self.send_token_fee_config.to_account_infos());
                    account_infos.extend(self.destination_owner.to_account_infos());
                    account_infos
                        .extend(self.associated_token_program.to_account_infos());
                    account_infos.extend(self.token_program.to_account_infos());
                    account_infos.extend(self.system_program.to_account_infos());
                    account_infos
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for SendTokensWithFee<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas.extend(self.send_tokens.to_account_metas(None));
                    account_metas.extend(self.fee_source.to_account_metas(None));
                    account_metas.extend(self.fee_destination.to_account_metas(None));
                    account_metas.extend(self.fee_mint.to_account_metas(None));
                    account_metas
                        .extend(self.send_token_fee_config.to_account_metas(None));
                    account_metas.extend(self.destination_owner.to_account_metas(None));
                    account_metas
                        .extend(self.associated_token_program.to_account_metas(None));
                    account_metas.extend(self.token_program.to_account_metas(None));
                    account_metas.extend(self.system_program.to_account_metas(None));
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::AccountsExit<'info> for SendTokensWithFee<'info>
            where
                'info: 'info,
            {
                fn exit(
                    &self,
                    program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                ) -> anchor_lang::Result<()> {
                    anchor_lang::AccountsExit::exit(&self.send_tokens, program_id)
                        .map_err(|e| e.with_account_name("send_tokens"))?;
                    anchor_lang::AccountsExit::exit(&self.fee_source, program_id)
                        .map_err(|e| e.with_account_name("fee_source"))?;
                    anchor_lang::AccountsExit::exit(&self.fee_destination, program_id)
                        .map_err(|e| e.with_account_name("fee_destination"))?;
                    Ok(())
                }
            }
            pub struct SendTokensWithFeeBumps {
                pub send_tokens: SendTokensBumps,
                pub send_token_fee_config: u8,
            }
            #[automatically_derived]
            impl ::core::fmt::Debug for SendTokensWithFeeBumps {
                #[inline]
                fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "SendTokensWithFeeBumps",
                        "send_tokens",
                        &self.send_tokens,
                        "send_token_fee_config",
                        &&self.send_token_fee_config,
                    )
                }
            }
            impl Default for SendTokensWithFeeBumps {
                fn default() -> Self {
                    SendTokensWithFeeBumps {
                        send_tokens: SendTokensBumps::default(),
                        send_token_fee_config: u8::MAX,
                    }
                }
            }
            impl<'info> anchor_lang::Bumps for SendTokensWithFee<'info>
            where
                'info: 'info,
            {
                type Bumps = SendTokensWithFeeBumps;
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
            /// instead of an `AccountInfo`. This is useful for clients that want
            /// to generate a list of accounts, without explicitly knowing the
            /// order all the fields should be in.
            ///
            /// To access the struct in this module, one should use the sibling
            /// `accounts` module (also generated), which re-exports this.
            pub(crate) mod __client_accounts_send_tokens_with_fee {
                use super::*;
                use anchor_lang::prelude::borsh;
                pub use __client_accounts_send_tokens::SendTokens;
                /// Generated client accounts for [`SendTokensWithFee`].
                pub struct SendTokensWithFee {
                    pub send_tokens: __client_accounts_send_tokens::SendTokens,
                    pub fee_source: Pubkey,
                    pub fee_destination: Pubkey,
                    pub fee_mint: Pubkey,
                    pub send_token_fee_config: Pubkey,
                    pub destination_owner: Pubkey,
                    pub associated_token_program: Pubkey,
                    pub token_program: Pubkey,
                    pub system_program: Pubkey,
                }
                impl borsh::ser::BorshSerialize for SendTokensWithFee
                where
                    __client_accounts_send_tokens::SendTokens: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                    Pubkey: borsh::ser::BorshSerialize,
                {
                    fn serialize<W: borsh::maybestd::io::Write>(
                        &self,
                        writer: &mut W,
                    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                        borsh::BorshSerialize::serialize(&self.send_tokens, writer)?;
                        borsh::BorshSerialize::serialize(&self.fee_source, writer)?;
                        borsh::BorshSerialize::serialize(&self.fee_destination, writer)?;
                        borsh::BorshSerialize::serialize(&self.fee_mint, writer)?;
                        borsh::BorshSerialize::serialize(
                            &self.send_token_fee_config,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.destination_owner,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(
                            &self.associated_token_program,
                            writer,
                        )?;
                        borsh::BorshSerialize::serialize(&self.token_program, writer)?;
                        borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                        Ok(())
                    }
                }
                #[automatically_derived]
                impl anchor_lang::ToAccountMetas for SendTokensWithFee {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas.extend(self.send_tokens.to_account_metas(None));
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.fee_source,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    self.fee_destination,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.fee_mint,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.send_token_fee_config,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.destination_owner,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.associated_token_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.token_program,
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    self.system_program,
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
            }
            /// An internal, Anchor generated module. This is used (as an
            /// implementation detail), to generate a CPI struct for a given
            /// `#[derive(Accounts)]` implementation, where each field is an
            /// AccountInfo.
            ///
            /// To access the struct in this module, one should use the sibling
            /// [`cpi::accounts`] module (also generated), which re-exports this.
            pub(crate) mod __cpi_client_accounts_send_tokens_with_fee {
                use super::*;
                pub use __cpi_client_accounts_send_tokens::SendTokens;
                /// Generated CPI struct of the accounts for [`SendTokensWithFee`].
                pub struct SendTokensWithFee<'info> {
                    pub send_tokens: __cpi_client_accounts_send_tokens::SendTokens<
                        'info,
                    >,
                    pub fee_source: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub fee_destination: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub fee_mint: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub send_token_fee_config: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub destination_owner: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub associated_token_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                        'info,
                    >,
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountMetas for SendTokensWithFee<'info> {
                    fn to_account_metas(
                        &self,
                        is_signer: Option<bool>,
                    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                        let mut account_metas = ::alloc::vec::Vec::new();
                        account_metas.extend(self.send_tokens.to_account_metas(None));
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.fee_source),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new(
                                    anchor_lang::Key::key(&self.fee_destination),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.fee_mint),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.send_token_fee_config),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.destination_owner),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.associated_token_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.token_program),
                                    false,
                                ),
                            );
                        account_metas
                            .push(
                                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                    anchor_lang::Key::key(&self.system_program),
                                    false,
                                ),
                            );
                        account_metas
                    }
                }
                #[automatically_derived]
                impl<'info> anchor_lang::ToAccountInfos<'info>
                for SendTokensWithFee<'info> {
                    fn to_account_infos(
                        &self,
                    ) -> Vec<
                        anchor_lang::solana_program::account_info::AccountInfo<'info>,
                    > {
                        let mut account_infos = ::alloc::vec::Vec::new();
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.send_tokens,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.fee_source,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.fee_destination,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.fee_mint,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.send_token_fee_config,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.destination_owner,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.associated_token_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.token_program,
                                ),
                            );
                        account_infos
                            .extend(
                                anchor_lang::ToAccountInfos::to_account_infos(
                                    &self.system_program,
                                ),
                            );
                        account_infos
                    }
                }
            }
            impl<'info> SendTokensWithFee<'info> {
                fn create_destination_account_and_collect_fee(
                    &mut self,
                    signer_seeds: &[&[&[u8]]],
                ) -> Result<()> {
                    match TokenAccount::try_deserialize(
                        &mut self.send_tokens.destination.data.borrow().as_ref(),
                    ) {
                        Err(_) => {
                            if self.send_tokens.destination.key()
                                != get_associated_token_address(
                                    &self.destination_owner.key(),
                                    &self.send_tokens.mint.key(),
                                )
                            {
                                return Err(
                                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                            error_name: ErrorCode::ConstraintAddress.name(),
                                            error_code_number: ErrorCode::ConstraintAddress.into(),
                                            error_msg: ErrorCode::ConstraintAddress.to_string(),
                                            error_origin: Some(
                                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                                    filename: "programs/intent-transfer/src/intrachain/processor/send_tokens_with_fee.rs",
                                                    line: 47u32,
                                                }),
                                            ),
                                            compared_values: None,
                                        })
                                        .with_values((
                                            self.send_tokens.destination.key(),
                                            get_associated_token_address(
                                                &self.destination_owner.key(),
                                                &self.send_tokens.mint.key(),
                                            ),
                                        )),
                                );
                            }
                            associated_token::create(
                                CpiContext::new(
                                    self.associated_token_program.to_account_info(),
                                    associated_token::Create {
                                        payer: self.send_tokens.sponsor.to_account_info(),
                                        associated_token: self
                                            .send_tokens
                                            .destination
                                            .to_account_info(),
                                        authority: self.destination_owner.to_account_info(),
                                        mint: self.send_tokens.mint.to_account_info(),
                                        system_program: self.system_program.to_account_info(),
                                        token_program: self.token_program.to_account_info(),
                                    },
                                ),
                            )?;
                            transfer_checked(
                                CpiContext::new_with_signer(
                                    self.token_program.to_account_info(),
                                    TransferChecked {
                                        authority: self
                                            .send_tokens
                                            .intent_transfer_setter
                                            .to_account_info(),
                                        from: self.fee_source.to_account_info(),
                                        mint: self.fee_mint.to_account_info(),
                                        to: self.fee_destination.to_account_info(),
                                    },
                                    signer_seeds,
                                ),
                                self.send_token_fee_config.ata_creation_fee,
                                self.fee_mint.decimals,
                            )
                        }
                        Ok(_) => Ok(()),
                    }
                }
                pub fn verify_and_send(
                    &mut self,
                    signer_seeds: &[&[&[u8]]],
                ) -> Result<()> {
                    self.create_destination_account_and_collect_fee(signer_seeds)?;
                    self.send_tokens.verify_and_send(signer_seeds)
                }
            }
        }
        const NONCE_SEED: &[u8] = b"nonce";
    }
}
mod nonce {
    use anchor_lang::prelude::*;
    pub struct Nonce {
        pub nonce: u64,
    }
    #[automatically_derived]
    impl anchor_lang::Space for Nonce {
        const INIT_SPACE: usize = 0 + 8;
    }
    impl borsh::ser::BorshSerialize for Nonce
    where
        u64: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.nonce, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for Nonce
    where
        u64: borsh::BorshDeserialize,
    {
        fn deserialize_reader<R: borsh::maybestd::io::Read>(
            reader: &mut R,
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                nonce: borsh::BorshDeserialize::deserialize_reader(reader)?,
            })
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for Nonce {
        #[inline]
        fn clone(&self) -> Nonce {
            Nonce {
                nonce: ::core::clone::Clone::clone(&self.nonce),
            }
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountSerialize for Nonce {
        fn try_serialize<W: std::io::Write>(
            &self,
            writer: &mut W,
        ) -> anchor_lang::Result<()> {
            if writer.write_all(Nonce::DISCRIMINATOR).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            if AnchorSerialize::serialize(self, writer).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountDeserialize for Nonce {
        fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            if buf.len() < Nonce::DISCRIMINATOR.len() {
                return Err(
                    anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into(),
                );
            }
            let given_disc = &buf[..Nonce::DISCRIMINATOR.len()];
            if Nonce::DISCRIMINATOR != given_disc {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                            error_name: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                .name(),
                            error_code_number: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                .into(),
                            error_msg: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                .to_string(),
                            error_origin: Some(
                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                    filename: "programs/intent-transfer/src/nonce.rs",
                                    line: 3u32,
                                }),
                            ),
                            compared_values: None,
                        })
                        .with_account_name("Nonce"),
                );
            }
            Self::try_deserialize_unchecked(buf)
        }
        fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            let mut data: &[u8] = &buf[Nonce::DISCRIMINATOR.len()..];
            AnchorDeserialize::deserialize(&mut data)
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into()
                })
        }
    }
    #[automatically_derived]
    impl anchor_lang::Discriminator for Nonce {
        const DISCRIMINATOR: &'static [u8] = &[143, 197, 147, 95, 106, 165, 50, 43];
    }
    #[automatically_derived]
    impl anchor_lang::Owner for Nonce {
        fn owner() -> Pubkey {
            crate::ID
        }
    }
}
mod verify {
    use crate::error::IntentTransferError;
    use crate::nonce::Nonce;
    use anchor_lang::prelude::*;
    use anchor_spl::token::Mint;
    use mpl_token_metadata::accounts::Metadata;
    use solana_intents::SymbolOrMint;
    pub fn verify_symbol_or_mint(
        symbol_or_mint: &SymbolOrMint,
        metadata: &Option<UncheckedAccount>,
        mint: &Account<Mint>,
    ) -> Result<()> {
        match (symbol_or_mint, metadata) {
            (SymbolOrMint::Symbol(ref symbol), Some(metadata)) => {
                if metadata.key() != Metadata::find_pda(&mint.key()).0 {
                    return Err(
                        anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                error_name: IntentTransferError::MetadataMismatch.name(),
                                error_code_number: IntentTransferError::MetadataMismatch
                                    .into(),
                                error_msg: IntentTransferError::MetadataMismatch
                                    .to_string(),
                                error_origin: Some(
                                    anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                        filename: "programs/intent-transfer/src/verify.rs",
                                        line: 15u32,
                                    }),
                                ),
                                compared_values: None,
                            })
                            .with_pubkeys((
                                metadata.key(),
                                Metadata::find_pda(&mint.key()).0,
                            )),
                    );
                }
                if &Metadata::try_from(&metadata.to_account_info())?.symbol
                    != &::alloc::__export::must_use({
                        let res = ::alloc::fmt::format(format_args!("{0: <10}", symbol));
                        res
                    })
                {
                    return Err(
                        anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                error_name: IntentTransferError::SymbolMismatch.name(),
                                error_code_number: IntentTransferError::SymbolMismatch
                                    .into(),
                                error_msg: IntentTransferError::SymbolMismatch.to_string(),
                                error_origin: Some(
                                    anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                        filename: "programs/intent-transfer/src/verify.rs",
                                        line: 20u32,
                                    }),
                                ),
                                compared_values: None,
                            })
                            .with_values((
                                &Metadata::try_from(&metadata.to_account_info())?.symbol,
                                &::alloc::__export::must_use({
                                    let res = ::alloc::fmt::format(
                                        format_args!("{0: <10}", symbol),
                                    );
                                    res
                                }),
                            )),
                    );
                }
            }
            (SymbolOrMint::Symbol(_), None) => {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: IntentTransferError::MetadataAccountRequired.name(),
                        error_code_number: IntentTransferError::MetadataAccountRequired
                            .into(),
                        error_msg: IntentTransferError::MetadataAccountRequired
                            .to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/intent-transfer/src/verify.rs",
                                line: 29u32,
                            }),
                        ),
                        compared_values: None,
                    }),
                );
            }
            (SymbolOrMint::Mint(ref expected_mint), None) => {
                if *expected_mint != mint.key() {
                    return Err(
                        anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                error_name: IntentTransferError::MintMismatch.name(),
                                error_code_number: IntentTransferError::MintMismatch.into(),
                                error_msg: IntentTransferError::MintMismatch.to_string(),
                                error_origin: Some(
                                    anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                        filename: "programs/intent-transfer/src/verify.rs",
                                        line: 33u32,
                                    }),
                                ),
                                compared_values: None,
                            })
                            .with_pubkeys((*expected_mint, mint.key())),
                    );
                }
            }
            (SymbolOrMint::Mint(_), Some(_)) => {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: IntentTransferError::MetadataAccountNotAllowed
                            .name(),
                        error_code_number: IntentTransferError::MetadataAccountNotAllowed
                            .into(),
                        error_msg: IntentTransferError::MetadataAccountNotAllowed
                            .to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/intent-transfer/src/verify.rs",
                                line: 41u32,
                            }),
                        ),
                        compared_values: None,
                    }),
                );
            }
        }
        Ok(())
    }
    pub fn verify_signer_matches_source(
        signer: Pubkey,
        source_owner: Pubkey,
    ) -> Result<()> {
        if signer != source_owner {
            return Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: IntentTransferError::SignerSourceMismatch.name(),
                        error_code_number: IntentTransferError::SignerSourceMismatch
                            .into(),
                        error_msg: IntentTransferError::SignerSourceMismatch.to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/intent-transfer/src/verify.rs",
                                line: 48u32,
                            }),
                        ),
                        compared_values: None,
                    })
                    .with_pubkeys((signer, source_owner)),
            );
        }
        Ok(())
    }
    pub fn verify_and_update_nonce(
        nonce: &mut Account<Nonce>,
        new_nonce: u64,
    ) -> Result<()> {
        if new_nonce != nonce.nonce + 1 {
            return Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: IntentTransferError::NonceFailure.name(),
                        error_code_number: IntentTransferError::NonceFailure.into(),
                        error_msg: IntentTransferError::NonceFailure.to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/intent-transfer/src/verify.rs",
                                line: 57u32,
                            }),
                        ),
                        compared_values: None,
                    })
                    .with_values((new_nonce, nonce.nonce + 1)),
            );
        }
        nonce.nonce = new_nonce;
        Ok(())
    }
}
use bridge::processor::bridge_ntt_tokens::*;
use config::processor::register_ntt_config::*;
use config::processor::register_send_token_fee_config::*;
use intrachain::processor::send_tokens::*;
use intrachain::processor::send_tokens_with_fee::*;
const INTENT_TRANSFER_SEED: &[u8] = b"intent_transfer";
use self::intent_transfer::*;
/// # Safety
#[no_mangle]
pub unsafe extern "C" fn entrypoint(input: *mut u8) -> u64 {
    let (program_id, accounts, instruction_data) = unsafe {
        ::solana_program_entrypoint::deserialize(input)
    };
    match entry(program_id, &accounts, instruction_data) {
        Ok(()) => ::solana_program_entrypoint::SUCCESS,
        Err(error) => error.into(),
    }
}
/// The Anchor codegen exposes a programming model where a user defines
/// a set of methods inside of a `#[program]` module in a way similar
/// to writing RPC request handlers. The macro then generates a bunch of
/// code wrapping these user defined methods into something that can be
/// executed on Solana.
///
/// These methods fall into one category for now.
///
/// Global methods - regular methods inside of the `#[program]`.
///
/// Care must be taken by the codegen to prevent collisions between
/// methods in these different namespaces. For this reason, Anchor uses
/// a variant of sighash to perform method dispatch, rather than
/// something like a simple enum variant discriminator.
///
/// The execution flow of the generated code can be roughly outlined:
///
/// * Start program via the entrypoint.
/// * Check whether the declared program id matches the input program
///   id. If it's not, return an error.
/// * Find and invoke the method based on whether the instruction data
///   starts with the method's discriminator.
/// * Run the method handler wrapper. This wraps the code the user
///   actually wrote, deserializing the accounts, constructing the
///   context, invoking the user's code, and finally running the exit
///   routine, which typically persists account changes.
///
/// The `entry` function here, defines the standard entry to a Solana
/// program, where execution begins.
pub fn entry<'info>(
    program_id: &Pubkey,
    accounts: &'info [AccountInfo<'info>],
    data: &[u8],
) -> anchor_lang::solana_program::entrypoint::ProgramResult {
    try_entry(program_id, accounts, data)
        .map_err(|e| {
            e.log();
            e.into()
        })
}
fn try_entry<'info>(
    program_id: &Pubkey,
    accounts: &'info [AccountInfo<'info>],
    data: &[u8],
) -> anchor_lang::Result<()> {
    if *program_id != ID {
        return Err(anchor_lang::error::ErrorCode::DeclaredProgramIdMismatch.into());
    }
    dispatch(program_id, accounts, data)
}
/// Module representing the program.
pub mod program {
    use super::*;
    /// Type representing the program.
    pub struct IntentTransfer;
    #[automatically_derived]
    impl ::core::clone::Clone for IntentTransfer {
        #[inline]
        fn clone(&self) -> IntentTransfer {
            IntentTransfer
        }
    }
    impl anchor_lang::Id for IntentTransfer {
        fn id() -> Pubkey {
            ID
        }
    }
}
/// Performs method dispatch.
///
/// Each instruction's discriminator is checked until the given instruction data starts with
/// the current discriminator.
///
/// If a match is found, the instruction handler is called using the given instruction data
/// excluding the prepended discriminator bytes.
///
/// If no match is found, the fallback function is executed if it exists, or an error is
/// returned if it doesn't exist.
fn dispatch<'info>(
    program_id: &Pubkey,
    accounts: &'info [AccountInfo<'info>],
    data: &[u8],
) -> anchor_lang::Result<()> {
    if data.starts_with(instruction::SendTokens::DISCRIMINATOR) {
        return __private::__global::send_tokens(
            program_id,
            accounts,
            &data[instruction::SendTokens::DISCRIMINATOR.len()..],
        );
    }
    if data.starts_with(instruction::BridgeNttTokens::DISCRIMINATOR) {
        return __private::__global::bridge_ntt_tokens(
            program_id,
            accounts,
            &data[instruction::BridgeNttTokens::DISCRIMINATOR.len()..],
        );
    }
    if data.starts_with(instruction::RegisterNttConfig::DISCRIMINATOR) {
        return __private::__global::register_ntt_config(
            program_id,
            accounts,
            &data[instruction::RegisterNttConfig::DISCRIMINATOR.len()..],
        );
    }
    if data.starts_with(instruction::SendTokensWithFee::DISCRIMINATOR) {
        return __private::__global::send_tokens_with_fee(
            program_id,
            accounts,
            &data[instruction::SendTokensWithFee::DISCRIMINATOR.len()..],
        );
    }
    if data.starts_with(instruction::RegisterSendTokenFeeConfig::DISCRIMINATOR) {
        return __private::__global::register_send_token_fee_config(
            program_id,
            accounts,
            &data[instruction::RegisterSendTokenFeeConfig::DISCRIMINATOR.len()..],
        );
    }
    if data.starts_with(anchor_lang::idl::IDL_IX_TAG_LE) {
        return __private::__idl::__idl_dispatch(
            program_id,
            accounts,
            &data[anchor_lang::idl::IDL_IX_TAG_LE.len()..],
        );
    }
    if data.starts_with(anchor_lang::event::EVENT_IX_TAG_LE) {
        return Err(anchor_lang::error::ErrorCode::EventInstructionStub.into());
    }
    Err(anchor_lang::error::ErrorCode::InstructionFallbackNotFound.into())
}
/// Create a private module to not clutter the program's namespace.
/// Defines an entrypoint for each individual instruction handler
/// wrapper.
mod __private {
    use super::*;
    /// __idl mod defines handlers for injected Anchor IDL instructions.
    pub mod __idl {
        use super::*;
        #[inline(never)]
        pub fn __idl_dispatch<'info>(
            program_id: &Pubkey,
            accounts: &'info [AccountInfo<'info>],
            idl_ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            let mut accounts = accounts;
            let mut data: &[u8] = idl_ix_data;
            let ix = anchor_lang::idl::IdlInstruction::deserialize(&mut data)
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            match ix {
                anchor_lang::idl::IdlInstruction::Create { data_len } => {
                    let mut bumps = <IdlCreateAccounts as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlCreateAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_create_account(program_id, &mut accounts, data_len)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::Resize { data_len } => {
                    let mut bumps = <IdlResizeAccount as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlResizeAccount::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_resize_account(program_id, &mut accounts, data_len)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::Close => {
                    let mut bumps = <IdlCloseAccount as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlCloseAccount::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_close_account(program_id, &mut accounts)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::CreateBuffer => {
                    let mut bumps = <IdlCreateBuffer as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlCreateBuffer::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_create_buffer(program_id, &mut accounts)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::Write { data } => {
                    let mut bumps = <IdlAccounts as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_write(program_id, &mut accounts, data)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::SetAuthority { new_authority } => {
                    let mut bumps = <IdlAccounts as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_set_authority(program_id, &mut accounts, new_authority)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::SetBuffer => {
                    let mut bumps = <IdlSetBuffer as anchor_lang::Bumps>::Bumps::default();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlSetBuffer::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_set_buffer(program_id, &mut accounts)?;
                    accounts.exit(program_id)?;
                }
            }
            Ok(())
        }
        use anchor_lang::idl::ERASED_AUTHORITY;
        pub struct IdlAccount {
            pub authority: Pubkey,
            pub data_len: u32,
        }
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlAccount {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::debug_struct_field2_finish(
                    f,
                    "IdlAccount",
                    "authority",
                    &self.authority,
                    "data_len",
                    &&self.data_len,
                )
            }
        }
        impl borsh::ser::BorshSerialize for IdlAccount
        where
            Pubkey: borsh::ser::BorshSerialize,
            u32: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.authority, writer)?;
                borsh::BorshSerialize::serialize(&self.data_len, writer)?;
                Ok(())
            }
        }
        impl borsh::de::BorshDeserialize for IdlAccount
        where
            Pubkey: borsh::BorshDeserialize,
            u32: borsh::BorshDeserialize,
        {
            fn deserialize_reader<R: borsh::maybestd::io::Read>(
                reader: &mut R,
            ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                Ok(Self {
                    authority: borsh::BorshDeserialize::deserialize_reader(reader)?,
                    data_len: borsh::BorshDeserialize::deserialize_reader(reader)?,
                })
            }
        }
        #[automatically_derived]
        impl ::core::clone::Clone for IdlAccount {
            #[inline]
            fn clone(&self) -> IdlAccount {
                IdlAccount {
                    authority: ::core::clone::Clone::clone(&self.authority),
                    data_len: ::core::clone::Clone::clone(&self.data_len),
                }
            }
        }
        #[automatically_derived]
        impl anchor_lang::AccountSerialize for IdlAccount {
            fn try_serialize<W: std::io::Write>(
                &self,
                writer: &mut W,
            ) -> anchor_lang::Result<()> {
                if writer.write_all(IdlAccount::DISCRIMINATOR).is_err() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountDidNotSerialize.into(),
                    );
                }
                if AnchorSerialize::serialize(self, writer).is_err() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountDidNotSerialize.into(),
                    );
                }
                Ok(())
            }
        }
        #[automatically_derived]
        impl anchor_lang::AccountDeserialize for IdlAccount {
            fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
                if buf.len() < IdlAccount::DISCRIMINATOR.len() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound
                            .into(),
                    );
                }
                let given_disc = &buf[..IdlAccount::DISCRIMINATOR.len()];
                if IdlAccount::DISCRIMINATOR != given_disc {
                    return Err(
                        anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                error_name: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                    .name(),
                                error_code_number: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                    .into(),
                                error_msg: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                    .to_string(),
                                error_origin: Some(
                                    anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                        filename: "programs/intent-transfer/src/lib.rs",
                                        line: 22u32,
                                    }),
                                ),
                                compared_values: None,
                            })
                            .with_account_name("IdlAccount"),
                    );
                }
                Self::try_deserialize_unchecked(buf)
            }
            fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
                let mut data: &[u8] = &buf[IdlAccount::DISCRIMINATOR.len()..];
                AnchorDeserialize::deserialize(&mut data)
                    .map_err(|_| {
                        anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into()
                    })
            }
        }
        #[automatically_derived]
        impl anchor_lang::Discriminator for IdlAccount {
            const DISCRIMINATOR: &'static [u8] = &[24, 70, 98, 191, 58, 144, 123, 158];
        }
        impl IdlAccount {
            pub fn address(program_id: &Pubkey) -> Pubkey {
                let program_signer = Pubkey::find_program_address(&[], program_id).0;
                Pubkey::create_with_seed(&program_signer, IdlAccount::seed(), program_id)
                    .expect("Seed is always valid")
            }
            pub fn seed() -> &'static str {
                "anchor:idl"
            }
        }
        impl anchor_lang::Owner for IdlAccount {
            fn owner() -> Pubkey {
                crate::ID
            }
        }
        pub struct IdlCreateAccounts<'info> {
            #[account(signer)]
            pub from: AccountInfo<'info>,
            #[account(mut)]
            pub to: AccountInfo<'info>,
            #[account(seeds = [], bump)]
            pub base: AccountInfo<'info>,
            pub system_program: Program<'info, System>,
            #[account(executable)]
            pub program: AccountInfo<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlCreateAccountsBumps>
        for IdlCreateAccounts<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlCreateAccountsBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let from: AccountInfo = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("from"))?;
                let to: AccountInfo = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("to"))?;
                let base: AccountInfo = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("base"))?;
                let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("system_program"))?;
                let program: AccountInfo = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("program"))?;
                if !&from.is_signer {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintSigner,
                            )
                            .with_account_name("from"),
                    );
                }
                if !&to.is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("to"),
                    );
                }
                let (__pda_address, __bump) = Pubkey::find_program_address(
                    &[],
                    &__program_id,
                );
                __bumps.base = __bump;
                if base.key() != __pda_address {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintSeeds,
                            )
                            .with_account_name("base")
                            .with_pubkeys((base.key(), __pda_address)),
                    );
                }
                if !&program.executable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintExecutable,
                            )
                            .with_account_name("program"),
                    );
                }
                Ok(IdlCreateAccounts {
                    from,
                    to,
                    base,
                    system_program,
                    program,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateAccounts<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.from.to_account_infos());
                account_infos.extend(self.to.to_account_infos());
                account_infos.extend(self.base.to_account_infos());
                account_infos.extend(self.system_program.to_account_infos());
                account_infos.extend(self.program.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlCreateAccounts<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.from.to_account_metas(Some(true)));
                account_metas.extend(self.to.to_account_metas(None));
                account_metas.extend(self.base.to_account_metas(None));
                account_metas.extend(self.system_program.to_account_metas(None));
                account_metas.extend(self.program.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlCreateAccounts<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.to, program_id)
                    .map_err(|e| e.with_account_name("to"))?;
                Ok(())
            }
        }
        pub struct IdlCreateAccountsBumps {
            pub base: u8,
        }
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlCreateAccountsBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::debug_struct_field1_finish(
                    f,
                    "IdlCreateAccountsBumps",
                    "base",
                    &&self.base,
                )
            }
        }
        impl Default for IdlCreateAccountsBumps {
            fn default() -> Self {
                IdlCreateAccountsBumps {
                    base: u8::MAX,
                }
            }
        }
        impl<'info> anchor_lang::Bumps for IdlCreateAccounts<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlCreateAccountsBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_create_accounts {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlCreateAccounts`].
            pub struct IdlCreateAccounts {
                pub from: Pubkey,
                pub to: Pubkey,
                pub base: Pubkey,
                pub system_program: Pubkey,
                pub program: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlCreateAccounts
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.from, writer)?;
                    borsh::BorshSerialize::serialize(&self.to, writer)?;
                    borsh::BorshSerialize::serialize(&self.base, writer)?;
                    borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                    borsh::BorshSerialize::serialize(&self.program, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlCreateAccounts {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.from,
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.to,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.base,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.system_program,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.program,
                                false,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_create_accounts {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlCreateAccounts`].
            pub struct IdlCreateAccounts<'info> {
                pub from: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub to: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub base: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub program: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlCreateAccounts<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.from),
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.to),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.base),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.system_program),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.program),
                                false,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateAccounts<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.from),
                        );
                    account_infos
                        .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.to));
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.base),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.system_program,
                            ),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.program),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlAccounts<'info> {
            #[account(mut, has_one = authority)]
            pub idl: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlAccountsBumps> for IdlAccounts<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlAccountsBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let idl: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("idl"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                if !AsRef::<AccountInfo>::as_ref(&idl).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("idl"),
                    );
                }
                {
                    let my_key = idl.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("idl")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlAccounts { idl, authority })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlAccounts<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.idl.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlAccounts<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.idl.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlAccounts<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.idl, program_id)
                    .map_err(|e| e.with_account_name("idl"))?;
                Ok(())
            }
        }
        pub struct IdlAccountsBumps {}
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlAccountsBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::write_str(f, "IdlAccountsBumps")
            }
        }
        impl Default for IdlAccountsBumps {
            fn default() -> Self {
                IdlAccountsBumps {}
            }
        }
        impl<'info> anchor_lang::Bumps for IdlAccounts<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlAccountsBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_accounts {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlAccounts`].
            pub struct IdlAccounts {
                pub idl: Pubkey,
                pub authority: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlAccounts
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.idl, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlAccounts {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.idl,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_accounts {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlAccounts`].
            pub struct IdlAccounts<'info> {
                pub idl: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlAccounts<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.idl),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlAccounts<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.idl),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlResizeAccount<'info> {
            #[account(mut, has_one = authority)]
            pub idl: Account<'info, IdlAccount>,
            #[account(mut, constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
            pub system_program: Program<'info, System>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlResizeAccountBumps>
        for IdlResizeAccount<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlResizeAccountBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let idl: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("idl"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("system_program"))?;
                if !AsRef::<AccountInfo>::as_ref(&idl).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("idl"),
                    );
                }
                {
                    let my_key = idl.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("idl")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                if !AsRef::<AccountInfo>::as_ref(&authority).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("authority"),
                    );
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlResizeAccount {
                    idl,
                    authority,
                    system_program,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlResizeAccount<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.idl.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos.extend(self.system_program.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlResizeAccount<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.idl.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas.extend(self.system_program.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlResizeAccount<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.idl, program_id)
                    .map_err(|e| e.with_account_name("idl"))?;
                anchor_lang::AccountsExit::exit(&self.authority, program_id)
                    .map_err(|e| e.with_account_name("authority"))?;
                Ok(())
            }
        }
        pub struct IdlResizeAccountBumps {}
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlResizeAccountBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::write_str(f, "IdlResizeAccountBumps")
            }
        }
        impl Default for IdlResizeAccountBumps {
            fn default() -> Self {
                IdlResizeAccountBumps {}
            }
        }
        impl<'info> anchor_lang::Bumps for IdlResizeAccount<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlResizeAccountBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_resize_account {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlResizeAccount`].
            pub struct IdlResizeAccount {
                pub idl: Pubkey,
                pub authority: Pubkey,
                pub system_program: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlResizeAccount
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.idl, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlResizeAccount {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.idl,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.system_program,
                                false,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_resize_account {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlResizeAccount`].
            pub struct IdlResizeAccount<'info> {
                pub idl: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlResizeAccount<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.idl),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.system_program),
                                false,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlResizeAccount<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.idl),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.system_program,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlCreateBuffer<'info> {
            #[account(zero)]
            pub buffer: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlCreateBufferBumps>
        for IdlCreateBuffer<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlCreateBufferBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                if __accounts.is_empty() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into(),
                    );
                }
                let buffer = &__accounts[0];
                *__accounts = &__accounts[1..];
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                let __anchor_rent = Rent::get()?;
                let buffer: anchor_lang::accounts::account::Account<IdlAccount> = {
                    let mut __data: &[u8] = &buffer.try_borrow_data()?;
                    let __disc = &__data[..IdlAccount::DISCRIMINATOR.len()];
                    let __has_disc = __disc.iter().any(|b| *b != 0);
                    if __has_disc {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintZero,
                                )
                                .with_account_name("buffer"),
                        );
                    }
                    match anchor_lang::accounts::account::Account::try_from_unchecked(
                        &buffer,
                    ) {
                        Ok(val) => val,
                        Err(e) => return Err(e.with_account_name("buffer")),
                    }
                };
                if !AsRef::<AccountInfo>::as_ref(&buffer).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !__anchor_rent
                    .is_exempt(
                        buffer.to_account_info().lamports(),
                        buffer.to_account_info().try_data_len()?,
                    )
                {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRentExempt,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlCreateBuffer {
                    buffer,
                    authority,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateBuffer<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.buffer.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlCreateBuffer<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.buffer.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlCreateBuffer<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.buffer, program_id)
                    .map_err(|e| e.with_account_name("buffer"))?;
                Ok(())
            }
        }
        pub struct IdlCreateBufferBumps {}
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlCreateBufferBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::write_str(f, "IdlCreateBufferBumps")
            }
        }
        impl Default for IdlCreateBufferBumps {
            fn default() -> Self {
                IdlCreateBufferBumps {}
            }
        }
        impl<'info> anchor_lang::Bumps for IdlCreateBuffer<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlCreateBufferBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_create_buffer {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlCreateBuffer`].
            pub struct IdlCreateBuffer {
                pub buffer: Pubkey,
                pub authority: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlCreateBuffer
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.buffer, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlCreateBuffer {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.buffer,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_create_buffer {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlCreateBuffer`].
            pub struct IdlCreateBuffer<'info> {
                pub buffer: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlCreateBuffer<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.buffer),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateBuffer<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.buffer),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlSetBuffer<'info> {
            #[account(mut, constraint = buffer.authority = = idl.authority)]
            pub buffer: Account<'info, IdlAccount>,
            #[account(mut, has_one = authority)]
            pub idl: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlSetBufferBumps>
        for IdlSetBuffer<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlSetBufferBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let buffer: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("buffer"))?;
                let idl: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("idl"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                if !AsRef::<AccountInfo>::as_ref(&buffer).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !(buffer.authority == idl.authority) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !AsRef::<AccountInfo>::as_ref(&idl).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("idl"),
                    );
                }
                {
                    let my_key = idl.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("idl")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlSetBuffer {
                    buffer,
                    idl,
                    authority,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlSetBuffer<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.buffer.to_account_infos());
                account_infos.extend(self.idl.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlSetBuffer<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.buffer.to_account_metas(None));
                account_metas.extend(self.idl.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlSetBuffer<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.buffer, program_id)
                    .map_err(|e| e.with_account_name("buffer"))?;
                anchor_lang::AccountsExit::exit(&self.idl, program_id)
                    .map_err(|e| e.with_account_name("idl"))?;
                Ok(())
            }
        }
        pub struct IdlSetBufferBumps {}
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlSetBufferBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::write_str(f, "IdlSetBufferBumps")
            }
        }
        impl Default for IdlSetBufferBumps {
            fn default() -> Self {
                IdlSetBufferBumps {}
            }
        }
        impl<'info> anchor_lang::Bumps for IdlSetBuffer<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlSetBufferBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_set_buffer {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlSetBuffer`].
            pub struct IdlSetBuffer {
                pub buffer: Pubkey,
                pub idl: Pubkey,
                pub authority: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlSetBuffer
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.buffer, writer)?;
                    borsh::BorshSerialize::serialize(&self.idl, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlSetBuffer {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.buffer,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.idl,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_set_buffer {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlSetBuffer`].
            pub struct IdlSetBuffer<'info> {
                pub buffer: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub idl: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlSetBuffer<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.buffer),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.idl),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlSetBuffer<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.buffer),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.idl),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlCloseAccount<'info> {
            #[account(mut, has_one = authority, close = sol_destination)]
            pub account: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
            #[account(mut)]
            pub sol_destination: AccountInfo<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info, IdlCloseAccountBumps>
        for IdlCloseAccount<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                __program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                __accounts: &mut &'info [anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                __ix_data: &[u8],
                __bumps: &mut IdlCloseAccountBumps,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let account: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("account"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                let sol_destination: AccountInfo = anchor_lang::Accounts::try_accounts(
                        __program_id,
                        __accounts,
                        __ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("sol_destination"))?;
                if !AsRef::<AccountInfo>::as_ref(&account).is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("account"),
                    );
                }
                {
                    let my_key = account.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("account")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                {
                    if account.key() == sol_destination.key() {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintClose,
                                )
                                .with_account_name("account"),
                        );
                    }
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                if !&sol_destination.is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("sol_destination"),
                    );
                }
                Ok(IdlCloseAccount {
                    account,
                    authority,
                    sol_destination,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCloseAccount<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.account.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos.extend(self.sol_destination.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlCloseAccount<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.account.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas.extend(self.sol_destination.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlCloseAccount<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                {
                    let sol_destination = &self.sol_destination;
                    anchor_lang::AccountsClose::close(
                            &self.account,
                            sol_destination.to_account_info(),
                        )
                        .map_err(|e| e.with_account_name("account"))?;
                }
                anchor_lang::AccountsExit::exit(&self.sol_destination, program_id)
                    .map_err(|e| e.with_account_name("sol_destination"))?;
                Ok(())
            }
        }
        pub struct IdlCloseAccountBumps {}
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlCloseAccountBumps {
            #[inline]
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::write_str(f, "IdlCloseAccountBumps")
            }
        }
        impl Default for IdlCloseAccountBumps {
            fn default() -> Self {
                IdlCloseAccountBumps {}
            }
        }
        impl<'info> anchor_lang::Bumps for IdlCloseAccount<'info>
        where
            'info: 'info,
        {
            type Bumps = IdlCloseAccountBumps;
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_close_account {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlCloseAccount`].
            pub struct IdlCloseAccount {
                pub account: Pubkey,
                pub authority: Pubkey,
                pub sol_destination: Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlCloseAccount
            where
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
                Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.account, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    borsh::BorshSerialize::serialize(&self.sol_destination, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlCloseAccount {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.account,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.sol_destination,
                                false,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_close_account {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlCloseAccount`].
            pub struct IdlCloseAccount<'info> {
                pub account: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub sol_destination: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlCloseAccount<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.account),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.sol_destination),
                                false,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCloseAccount<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.account),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.sol_destination,
                            ),
                        );
                    account_infos
                }
            }
        }
        use std::cell::{Ref, RefMut};
        pub trait IdlTrailingData<'info> {
            fn trailing_data(self) -> Ref<'info, [u8]>;
            fn trailing_data_mut(self) -> RefMut<'info, [u8]>;
        }
        impl<'a, 'info: 'a> IdlTrailingData<'a> for &'a Account<'info, IdlAccount> {
            fn trailing_data(self) -> Ref<'a, [u8]> {
                let info: &AccountInfo<'info> = self.as_ref();
                Ref::map(info.try_borrow_data().unwrap(), |d| &d[44..])
            }
            fn trailing_data_mut(self) -> RefMut<'a, [u8]> {
                let info: &AccountInfo<'info> = self.as_ref();
                RefMut::map(info.try_borrow_mut_data().unwrap(), |d| &mut d[44..])
            }
        }
        #[inline(never)]
        pub fn __idl_create_account(
            program_id: &Pubkey,
            accounts: &mut IdlCreateAccounts,
            data_len: u64,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlCreateAccount");
            if program_id != accounts.program.key {
                return Err(
                    anchor_lang::error::ErrorCode::IdlInstructionInvalidProgram.into(),
                );
            }
            let from = accounts.from.key;
            let (base, nonce) = Pubkey::find_program_address(&[], program_id);
            let seed = IdlAccount::seed();
            let owner = accounts.program.key;
            let to = Pubkey::create_with_seed(&base, seed, owner).unwrap();
            let space = std::cmp::min(
                IdlAccount::DISCRIMINATOR.len() + 32 + 4 + data_len as usize,
                10_000,
            );
            let rent = Rent::get()?;
            let lamports = rent.minimum_balance(space);
            let seeds = &[&[nonce][..]];
            let ix = anchor_lang::solana_program::system_instruction::create_account_with_seed(
                from,
                &to,
                &base,
                seed,
                lamports,
                space as u64,
                owner,
            );
            anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &[
                    accounts.from.clone(),
                    accounts.to.clone(),
                    accounts.base.clone(),
                    accounts.system_program.to_account_info(),
                ],
                &[seeds],
            )?;
            let mut idl_account = {
                let mut account_data = accounts.to.try_borrow_data()?;
                let mut account_data_slice: &[u8] = &account_data;
                IdlAccount::try_deserialize_unchecked(&mut account_data_slice)?
            };
            idl_account.authority = *accounts.from.key;
            let mut data = accounts.to.try_borrow_mut_data()?;
            let dst: &mut [u8] = &mut data;
            let mut cursor = std::io::Cursor::new(dst);
            idl_account.try_serialize(&mut cursor)?;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_resize_account(
            program_id: &Pubkey,
            accounts: &mut IdlResizeAccount,
            data_len: u64,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlResizeAccount");
            let data_len: usize = data_len as usize;
            if accounts.idl.data_len != 0 {
                return Err(anchor_lang::error::ErrorCode::IdlAccountNotEmpty.into());
            }
            let idl_ref = AsRef::<AccountInfo>::as_ref(&accounts.idl);
            let new_account_space = idl_ref
                .data_len()
                .checked_add(
                    std::cmp::min(
                        data_len
                            .checked_sub(idl_ref.data_len())
                            .expect(
                                "data_len should always be >= the current account space",
                            ),
                        10_000,
                    ),
                )
                .unwrap();
            if new_account_space > idl_ref.data_len() {
                let sysvar_rent = Rent::get()?;
                let new_rent_minimum = sysvar_rent.minimum_balance(new_account_space);
                anchor_lang::system_program::transfer(
                    anchor_lang::context::CpiContext::new(
                        accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: accounts.authority.to_account_info(),
                            to: accounts.idl.to_account_info(),
                        },
                    ),
                    new_rent_minimum.checked_sub(idl_ref.lamports()).unwrap(),
                )?;
                idl_ref.realloc(new_account_space, false)?;
            }
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_close_account(
            program_id: &Pubkey,
            accounts: &mut IdlCloseAccount,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlCloseAccount");
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_create_buffer(
            program_id: &Pubkey,
            accounts: &mut IdlCreateBuffer,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlCreateBuffer");
            let mut buffer = &mut accounts.buffer;
            buffer.authority = *accounts.authority.key;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_write(
            program_id: &Pubkey,
            accounts: &mut IdlAccounts,
            idl_data: Vec<u8>,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlWrite");
            let prev_len: usize = ::std::convert::TryInto::<
                usize,
            >::try_into(accounts.idl.data_len)
                .unwrap();
            let new_len: usize = prev_len.checked_add(idl_data.len()).unwrap() as usize;
            accounts
                .idl
                .data_len = accounts
                .idl
                .data_len
                .checked_add(
                    ::std::convert::TryInto::<u32>::try_into(idl_data.len()).unwrap(),
                )
                .unwrap();
            use IdlTrailingData;
            let mut idl_bytes = accounts.idl.trailing_data_mut();
            let idl_expansion = &mut idl_bytes[prev_len..new_len];
            if idl_expansion.len() != idl_data.len() {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                            error_name: anchor_lang::error::ErrorCode::RequireEqViolated
                                .name(),
                            error_code_number: anchor_lang::error::ErrorCode::RequireEqViolated
                                .into(),
                            error_msg: anchor_lang::error::ErrorCode::RequireEqViolated
                                .to_string(),
                            error_origin: Some(
                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                    filename: "programs/intent-transfer/src/lib.rs",
                                    line: 22u32,
                                }),
                            ),
                            compared_values: None,
                        })
                        .with_values((idl_expansion.len(), idl_data.len())),
                );
            }
            idl_expansion.copy_from_slice(&idl_data[..]);
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_set_authority(
            program_id: &Pubkey,
            accounts: &mut IdlAccounts,
            new_authority: Pubkey,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlSetAuthority");
            accounts.idl.authority = new_authority;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_set_buffer(
            program_id: &Pubkey,
            accounts: &mut IdlSetBuffer,
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: IdlSetBuffer");
            accounts.idl.data_len = accounts.buffer.data_len;
            use IdlTrailingData;
            let buffer_len = ::std::convert::TryInto::<
                usize,
            >::try_into(accounts.buffer.data_len)
                .unwrap();
            let mut target = accounts.idl.trailing_data_mut();
            let source = &accounts.buffer.trailing_data()[..buffer_len];
            if target.len() < buffer_len {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                            error_name: anchor_lang::error::ErrorCode::RequireGteViolated
                                .name(),
                            error_code_number: anchor_lang::error::ErrorCode::RequireGteViolated
                                .into(),
                            error_msg: anchor_lang::error::ErrorCode::RequireGteViolated
                                .to_string(),
                            error_origin: Some(
                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                    filename: "programs/intent-transfer/src/lib.rs",
                                    line: 22u32,
                                }),
                            ),
                            compared_values: None,
                        })
                        .with_values((target.len(), buffer_len)),
                );
            }
            target[..buffer_len].copy_from_slice(source);
            Ok(())
        }
    }
    /// __global mod defines wrapped handlers for global instructions.
    pub mod __global {
        use super::*;
        #[inline(never)]
        pub fn send_tokens<'info>(
            __program_id: &Pubkey,
            __accounts: &'info [AccountInfo<'info>],
            __ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: SendTokens");
            let ix = instruction::SendTokens::deserialize(&mut &__ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::SendTokens = ix;
            let mut __bumps = <SendTokens as anchor_lang::Bumps>::Bumps::default();
            let mut __reallocs = std::collections::BTreeSet::new();
            let mut __remaining_accounts: &[AccountInfo] = __accounts;
            let mut __accounts = SendTokens::try_accounts(
                __program_id,
                &mut __remaining_accounts,
                __ix_data,
                &mut __bumps,
                &mut __reallocs,
            )?;
            let result = intent_transfer::send_tokens(
                anchor_lang::context::Context::new(
                    __program_id,
                    &mut __accounts,
                    __remaining_accounts,
                    __bumps,
                ),
            )?;
            __accounts.exit(__program_id)
        }
        #[inline(never)]
        pub fn bridge_ntt_tokens<'info>(
            __program_id: &Pubkey,
            __accounts: &'info [AccountInfo<'info>],
            __ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: BridgeNttTokens");
            let ix = instruction::BridgeNttTokens::deserialize(&mut &__ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::BridgeNttTokens { args } = ix;
            let mut __bumps = <BridgeNttTokens as anchor_lang::Bumps>::Bumps::default();
            let mut __reallocs = std::collections::BTreeSet::new();
            let mut __remaining_accounts: &[AccountInfo] = __accounts;
            let mut __accounts = BridgeNttTokens::try_accounts(
                __program_id,
                &mut __remaining_accounts,
                __ix_data,
                &mut __bumps,
                &mut __reallocs,
            )?;
            let result = intent_transfer::bridge_ntt_tokens(
                anchor_lang::context::Context::new(
                    __program_id,
                    &mut __accounts,
                    __remaining_accounts,
                    __bumps,
                ),
                args,
            )?;
            __accounts.exit(__program_id)
        }
        #[inline(never)]
        pub fn register_ntt_config<'info>(
            __program_id: &Pubkey,
            __accounts: &'info [AccountInfo<'info>],
            __ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: RegisterNttConfig");
            let ix = instruction::RegisterNttConfig::deserialize(&mut &__ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::RegisterNttConfig = ix;
            let mut __bumps = <RegisterNttConfig as anchor_lang::Bumps>::Bumps::default();
            let mut __reallocs = std::collections::BTreeSet::new();
            let mut __remaining_accounts: &[AccountInfo] = __accounts;
            let mut __accounts = RegisterNttConfig::try_accounts(
                __program_id,
                &mut __remaining_accounts,
                __ix_data,
                &mut __bumps,
                &mut __reallocs,
            )?;
            let result = intent_transfer::register_ntt_config(
                anchor_lang::context::Context::new(
                    __program_id,
                    &mut __accounts,
                    __remaining_accounts,
                    __bumps,
                ),
            )?;
            __accounts.exit(__program_id)
        }
        #[inline(never)]
        pub fn send_tokens_with_fee<'info>(
            __program_id: &Pubkey,
            __accounts: &'info [AccountInfo<'info>],
            __ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: SendTokensWithFee");
            let ix = instruction::SendTokensWithFee::deserialize(&mut &__ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::SendTokensWithFee = ix;
            let mut __bumps = <SendTokensWithFee as anchor_lang::Bumps>::Bumps::default();
            let mut __reallocs = std::collections::BTreeSet::new();
            let mut __remaining_accounts: &[AccountInfo] = __accounts;
            let mut __accounts = SendTokensWithFee::try_accounts(
                __program_id,
                &mut __remaining_accounts,
                __ix_data,
                &mut __bumps,
                &mut __reallocs,
            )?;
            let result = intent_transfer::send_tokens_with_fee(
                anchor_lang::context::Context::new(
                    __program_id,
                    &mut __accounts,
                    __remaining_accounts,
                    __bumps,
                ),
            )?;
            __accounts.exit(__program_id)
        }
        #[inline(never)]
        pub fn register_send_token_fee_config<'info>(
            __program_id: &Pubkey,
            __accounts: &'info [AccountInfo<'info>],
            __ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_msg::sol_log("Instruction: RegisterSendTokenFeeConfig");
            let ix = instruction::RegisterSendTokenFeeConfig::deserialize(
                    &mut &__ix_data[..],
                )
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::RegisterSendTokenFeeConfig { ata_creation_fee } = ix;
            let mut __bumps = <RegisterSendTokenFeeConfig as anchor_lang::Bumps>::Bumps::default();
            let mut __reallocs = std::collections::BTreeSet::new();
            let mut __remaining_accounts: &[AccountInfo] = __accounts;
            let mut __accounts = RegisterSendTokenFeeConfig::try_accounts(
                __program_id,
                &mut __remaining_accounts,
                __ix_data,
                &mut __bumps,
                &mut __reallocs,
            )?;
            let result = intent_transfer::register_send_token_fee_config(
                anchor_lang::context::Context::new(
                    __program_id,
                    &mut __accounts,
                    __remaining_accounts,
                    __bumps,
                ),
                ata_creation_fee,
            )?;
            __accounts.exit(__program_id)
        }
    }
}
pub mod intent_transfer {
    use super::*;
    pub fn send_tokens<'info>(
        ctx: Context<'_, '_, '_, 'info, SendTokens<'info>>,
    ) -> Result<()> {
        ctx.accounts
            .verify_and_send(
                &[&[INTENT_TRANSFER_SEED, &[ctx.bumps.intent_transfer_setter]]],
            )
    }
    pub fn bridge_ntt_tokens<'info>(
        ctx: Context<'_, '_, '_, 'info, BridgeNttTokens<'info>>,
        args: BridgeNttTokensArgs,
    ) -> Result<()> {
        ctx.accounts
            .verify_and_initiate_bridge(
                &[&[INTENT_TRANSFER_SEED, &[ctx.bumps.intent_transfer_setter]]],
                args,
            )
    }
    pub fn register_ntt_config<'info>(
        ctx: Context<'_, '_, '_, 'info, RegisterNttConfig<'info>>,
    ) -> Result<()> {
        ctx.accounts.process()
    }
    pub fn send_tokens_with_fee<'info>(
        ctx: Context<'_, '_, '_, 'info, SendTokensWithFee<'info>>,
    ) -> Result<()> {
        ctx.accounts
            .verify_and_send(
                &[
                    &[
                        INTENT_TRANSFER_SEED,
                        &[ctx.bumps.send_tokens.intent_transfer_setter],
                    ],
                ],
            )
    }
    pub fn register_send_token_fee_config<'info>(
        ctx: Context<'_, '_, '_, 'info, RegisterSendTokenFeeConfig<'info>>,
        ata_creation_fee: u64,
    ) -> Result<()> {
        ctx.accounts.process(ata_creation_fee)
    }
}
/// An Anchor generated module containing the program's set of
/// instructions, where each method handler in the `#[program]` mod is
/// associated with a struct defining the input arguments to the
/// method. These should be used directly, when one wants to serialize
/// Anchor instruction data, for example, when speciying
/// instructions on a client.
pub mod instruction {
    use super::*;
    /// Instruction.
    pub struct SendTokens;
    impl borsh::ser::BorshSerialize for SendTokens {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for SendTokens {
        fn deserialize_reader<R: borsh::maybestd::io::Read>(
            reader: &mut R,
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::Discriminator for SendTokens {
        const DISCRIMINATOR: &'static [u8] = &[0];
    }
    impl anchor_lang::InstructionData for SendTokens {}
    impl anchor_lang::Owner for SendTokens {
        fn owner() -> Pubkey {
            ID
        }
    }
    /// Instruction.
    pub struct BridgeNttTokens {
        pub args: BridgeNttTokensArgs,
    }
    impl borsh::ser::BorshSerialize for BridgeNttTokens
    where
        BridgeNttTokensArgs: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.args, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for BridgeNttTokens
    where
        BridgeNttTokensArgs: borsh::BorshDeserialize,
    {
        fn deserialize_reader<R: borsh::maybestd::io::Read>(
            reader: &mut R,
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                args: borsh::BorshDeserialize::deserialize_reader(reader)?,
            })
        }
    }
    impl anchor_lang::Discriminator for BridgeNttTokens {
        const DISCRIMINATOR: &'static [u8] = &[1];
    }
    impl anchor_lang::InstructionData for BridgeNttTokens {}
    impl anchor_lang::Owner for BridgeNttTokens {
        fn owner() -> Pubkey {
            ID
        }
    }
    /// Instruction.
    pub struct RegisterNttConfig;
    impl borsh::ser::BorshSerialize for RegisterNttConfig {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for RegisterNttConfig {
        fn deserialize_reader<R: borsh::maybestd::io::Read>(
            reader: &mut R,
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::Discriminator for RegisterNttConfig {
        const DISCRIMINATOR: &'static [u8] = &[2];
    }
    impl anchor_lang::InstructionData for RegisterNttConfig {}
    impl anchor_lang::Owner for RegisterNttConfig {
        fn owner() -> Pubkey {
            ID
        }
    }
    /// Instruction.
    pub struct SendTokensWithFee;
    impl borsh::ser::BorshSerialize for SendTokensWithFee {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for SendTokensWithFee {
        fn deserialize_reader<R: borsh::maybestd::io::Read>(
            reader: &mut R,
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::Discriminator for SendTokensWithFee {
        const DISCRIMINATOR: &'static [u8] = &[3];
    }
    impl anchor_lang::InstructionData for SendTokensWithFee {}
    impl anchor_lang::Owner for SendTokensWithFee {
        fn owner() -> Pubkey {
            ID
        }
    }
    /// Instruction.
    pub struct RegisterSendTokenFeeConfig {
        pub ata_creation_fee: u64,
    }
    impl borsh::ser::BorshSerialize for RegisterSendTokenFeeConfig
    where
        u64: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.ata_creation_fee, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for RegisterSendTokenFeeConfig
    where
        u64: borsh::BorshDeserialize,
    {
        fn deserialize_reader<R: borsh::maybestd::io::Read>(
            reader: &mut R,
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                ata_creation_fee: borsh::BorshDeserialize::deserialize_reader(reader)?,
            })
        }
    }
    impl anchor_lang::Discriminator for RegisterSendTokenFeeConfig {
        const DISCRIMINATOR: &'static [u8] = &[4];
    }
    impl anchor_lang::InstructionData for RegisterSendTokenFeeConfig {}
    impl anchor_lang::Owner for RegisterSendTokenFeeConfig {
        fn owner() -> Pubkey {
            ID
        }
    }
}
/// An Anchor generated module, providing a set of structs
/// mirroring the structs deriving `Accounts`, where each field is
/// a `Pubkey`. This is useful for specifying accounts for a client.
pub mod accounts {
    pub use crate::__client_accounts_send_tokens::*;
    pub use crate::__client_accounts_register_ntt_config::*;
    pub use crate::__client_accounts_register_send_token_fee_config::*;
    pub use crate::__client_accounts_bridge_ntt_tokens::*;
    pub use crate::__client_accounts_send_tokens_with_fee::*;
}
