use anchor_lang::{prelude::*, system_program};

pub fn initialize_account<'a, 'info>(
    payer: &'a AccountInfo<'info>,
    new_account: &'a AccountInfo<'info>,
    system_program: &'a AccountInfo<'info>,
    program_owner: &Pubkey,
    rent: &Rent,
    space: u64,
) -> Result<()> {
    let current_lamports = **new_account.try_borrow_lamports()?;
    if current_lamports == 0 {
        system_program::create_account(
            CpiContext::new(
                system_program.to_account_info(),
                system_program::CreateAccount {
                    from: payer.to_account_info(),
                    to: new_account.to_account_info(),
                },
            ),
            rent.minimum_balance(space.try_into().expect("usize is u64 in sbf programs")),
            space,
            program_owner,
        )
    } else {
        // Handle the case where the account has received some lamports and is therefore already "created"
        let required_lamports = rent
            .minimum_balance(space.try_into().expect("usize is u64 in sbf programs"))
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
            CpiContext::new(
                system_program.to_account_info(),
                system_program::Allocate {
                    account_to_allocate: new_account.to_account_info(),
                },
            ),
            space,
        )?;
        system_program::assign(
            CpiContext::new(
                system_program.to_account_info(),
                system_program::Assign {
                    account_to_assign: new_account.to_account_info(),
                },
            ),
            program_owner,
        )
    }
}
