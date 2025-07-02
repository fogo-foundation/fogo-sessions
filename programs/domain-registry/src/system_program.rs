use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::{prelude::*, system_program};

pub fn create_pda<'a, 'info>(
    payer: &'a AccountInfo<'info>,
    new_account: &'a AccountInfo<'info>,
    system_program: &'a AccountInfo<'info>,
    program_owner: &Pubkey,
    rent: &Rent,
    space: u64,
    seeds: Vec<Vec<u8>>,
) -> Result<()> {
    let current_lamports = **new_account.try_borrow_lamports()?;
    if current_lamports == 0 {
        system_program::create_account(
            CpiContext::new_with_signer(
                system_program.to_account_info(),
                system_program::CreateAccount {
                    from: payer.to_account_info(),
                    to: new_account.to_account_info(),
                },
                &[seeds
                    .iter()
                    .map(|seed| seed.as_slice())
                    .collect::<Vec<&[u8]>>()
                    .as_slice()],
            ),
            rent.minimum_balance(space as usize),
            space,
            program_owner,
        )
    } else {
        let required_lamports = rent
            .minimum_balance(space as usize)
            .max(1)
            .saturating_sub(current_lamports);
        if required_lamports > 0 {
            system_program::transfer(
                CpiContext::new(
                    system_program.to_account_info(),
                    system_program::Transfer {
                        from: payer.to_account_info(),
                        to: new_account.to_account_info(),
                    },
                ),
                required_lamports,
            )?;
        }
        system_program::allocate(
            CpiContext::new_with_signer(
                system_program.to_account_info(),
                system_program::Allocate {
                    account_to_allocate: new_account.to_account_info(),
                },
                &[seeds
                    .iter()
                    .map(|seed| seed.as_slice())
                    .collect::<Vec<&[u8]>>()
                    .as_slice()],
            ),
            space,
        )?;
        system_program::assign(
            CpiContext::new_with_signer(
                system_program.to_account_info(),
                system_program::Assign {
                    account_to_assign: new_account.to_account_info(),
                },
                &[seeds
                    .iter()
                    .map(|seed| seed.as_slice())
                    .collect::<Vec<&[u8]>>()
                    .as_slice()],
            ),
            program_owner,
        )
    }
}
