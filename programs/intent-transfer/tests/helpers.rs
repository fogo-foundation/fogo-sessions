use anchor_lang::{prelude::Pubkey, solana_program::system_instruction};
use litesvm::{LiteSVM, types::TransactionResult};
use solana_instruction::Instruction;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Transaction;
use spl_associated_token_account::{
    get_associated_token_address_with_program_id,
    instruction::create_associated_token_account_idempotent,
};
use spl_token::{
    instruction::{initialize_account, initialize_mint, mint_to},
    solana_program::{native_token::LAMPORTS_PER_SOL, program_pack::Pack},
};

pub fn generate_and_fund_key(svm: &mut litesvm::LiteSVM) -> Keypair {
    let keypair = Keypair::new();
    let pubkey = keypair.pubkey();
    svm.airdrop(&pubkey, 10 * LAMPORTS_PER_SOL).unwrap();
    keypair
}

pub fn submit_transaction(
    svm: &mut litesvm::LiteSVM,
    ixs: &[Instruction],
    payer: &Keypair,
    signers: &[&Keypair],
) -> TransactionResult {
    let tx = Transaction::new_signed_with_payer(
        ixs,
        Some(&payer.pubkey()),
        signers,
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx)
}

pub struct Token {
    pub mint:          Pubkey,
    pub decimals:      u8,
    mint_authority:    Keypair,
    pub token_program: Pubkey,
}

impl Clone for Token {
    fn clone(&self) -> Self {
        Self {
            mint:           self.mint,
            decimals:       self.decimals,
            mint_authority: self.mint_authority.insecure_clone(),
            token_program:  self.token_program,
        }
    }
}

impl Token {
    pub fn airdrop(&self, svm: &mut LiteSVM, destination: &Pubkey, amount: f64) -> Pubkey {
        let ata = get_associated_token_address_with_program_id(
            destination,
            &self.mint,
            &self.token_program,
        );

        let instructions = vec![
            create_associated_token_account_idempotent(
                &self.mint_authority.pubkey(),
                destination,
                &self.mint,
                &self.token_program,
            ),
            mint_to(
                &self.token_program,
                &self.mint,
                &ata,
                &self.mint_authority.pubkey(),
                &[&self.mint_authority.pubkey()],
                self.get_amount_with_decimals(amount),
            )
            .unwrap(),
        ];
        submit_transaction(
            svm,
            &instructions,
            &self.mint_authority,
            &[&self.mint_authority],
        )
        .unwrap();

        ata
    }

    pub fn create_token_account(&self, svm: &mut LiteSVM, owner: &Pubkey) -> Pubkey {
        let token_account = Keypair::new();
        let token_account_rent =
            svm.minimum_balance_for_rent_exemption(spl_token::state::Account::LEN);
        let instructions = vec![
            system_instruction::create_account(
                &self.mint_authority.pubkey(),
                &token_account.pubkey(),
                token_account_rent,
                spl_token::state::Account::LEN.try_into().unwrap(),
                &self.token_program,
            ),
            initialize_account(
                &self.token_program,
                &token_account.pubkey(),
                &self.mint,
                owner,
            )
            .unwrap(),
        ];
        submit_transaction(
            svm,
            &instructions,
            &self.mint_authority,
            &[&token_account, &self.mint_authority],
        )
        .unwrap();
        token_account.pubkey()
    }

    pub fn create_mint(svm: &mut LiteSVM, token_program: Pubkey, decimals: u8) -> Self {
        let mint = Keypair::new();
        let mint_authority = generate_and_fund_key(svm);
        let mint_rent = svm.minimum_balance_for_rent_exemption(spl_token::state::Mint::LEN);
        let instructions = vec![
            system_instruction::create_account(
                &mint_authority.pubkey(),
                &mint.pubkey(),
                mint_rent,
                spl_token::state::Mint::LEN.try_into().unwrap(),
                &token_program,
            ),
            initialize_mint(
                &token_program,
                &mint.pubkey(),
                &mint_authority.pubkey(),
                None,
                decimals,
            )
            .unwrap(),
        ];
        submit_transaction(
            svm,
            &instructions,
            &mint_authority,
            &[&mint, &mint_authority],
        )
        .unwrap();
        Self {
            mint: mint.pubkey(),
            decimals,
            mint_authority,
            token_program,
        }
    }

    pub fn get_amount_with_decimals(&self, amount: f64) -> u64 {
        (amount * 10f64.powi(self.decimals as i32)).floor() as u64
    }

    pub fn get_balance(&self, svm: &LiteSVM, token_account: &Pubkey) -> u64 {
        let account = svm.get_account(token_account).expect("Token account not found");
        let account_data = spl_token::state::Account::unpack(&account.data).expect("Failed to unpack token account");
        account_data.amount
    }
}