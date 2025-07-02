use std::marker::PhantomData;
use anchor_lang::{prelude::*, solana_program::system_instruction};
use bytemuck::{Pod, Zeroable};

#[account]
pub struct DomainRecord {}

pub type DomainRecordInner<'a> = resizable_account_array::ResizableAccountArray<'a, fogo_sessions_sdk::AuthorizedProgram>;

mod resizable_account_array {
    use super::*;
    pub struct ResizableAccountArray<'a, T> where T : Pod + Zeroable + PartialEq {
        pub acc_info : AccountInfo<'a>,
        pub payer : AccountInfo<'a>,
        pub _phantom : PhantomData<T>,
    }

    impl <'a, T> ResizableAccountArray<'a, T> where T : Pod + Zeroable + PartialEq {
        pub fn load(acc_info : AccountInfo<'a>, payer : AccountInfo<'a>) -> Self {
            Self { acc_info, payer, _phantom: PhantomData }
        }

        pub fn push(&mut self, value: T) -> Result<()> {
            self.extend()?;

            let data_len = self.acc_info.data_len();
            let mut data = self.acc_info.try_borrow_mut_data()?;
            let new : &mut T = bytemuck::from_bytes_mut(&mut data[data_len - size_of::<T>()..]);
            *new = value;
            Ok(())
        }

        pub fn contains(&self, value: T) -> Result<bool> {
            let data = self.acc_info.try_borrow_data()?;
            Ok(bytemuck::cast_slice(&data).contains(&value))
        }

        pub fn to_vec(&self) -> Result<Vec<T>> {
            let data = self.acc_info.try_borrow_data()?;
            Ok(bytemuck::cast_slice(&data).to_vec())
        }

        fn extend(&mut self) -> Result<()> {
            self.acc_info.realloc(self.acc_info.data_len() + size_of::<T>(), false)?;
            self.adjust_rent_if_needed()?;
            Ok(())
        }

        fn adjust_rent_if_needed(&mut self) -> Result<()> {
            let rent = Rent::get()?;
            let amount_required = rent.minimum_balance(self.acc_info.data_len());
            let amount_to_transfer = amount_required.saturating_sub(self.acc_info.lamports());

            if amount_to_transfer > 0 {
                let transfer_instruction =
                    system_instruction::transfer(self.payer.key, self.acc_info.key, amount_to_transfer);

                anchor_lang::solana_program::program::invoke(
                    &transfer_instruction,
                    &[self.payer.to_account_info(), self.acc_info.clone()],
                )?;
            }

            let amount_to_withdraw = self.acc_info.lamports().saturating_sub(amount_required);

            if amount_to_withdraw > 0 {
                **self.payer.try_borrow_mut_lamports()? += amount_to_withdraw;
                **self.acc_info.try_borrow_mut_lamports()? -= amount_to_withdraw;
            }
            Ok(())
        }
    }
}

