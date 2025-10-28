use anchor_lang::{
    solana_program::{
        ed25519_program, pubkey::Pubkey, instruction::Instruction, sysvar
    },
    system_program,
    ToAccountMetas,
    InstructionData,
};
use anchor_spl::token_2022::spl_token_2022::try_ui_amount_into_amount;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Transaction;
use spl_token::solana_program::keccak;

use intent_transfer::cpi::ntt_with_executor::{EXECUTOR_PROGRAM_ID, NTT_WITH_EXECUTOR_PROGRAM_ID};
use intent_transfer::cpi::ntt_manager::WORMHOLE_PROGRAM_ID;

mod helpers;

fn create_ntt_bridge_message(
    from_chain_id: &str,
    token_symbol: &str,
    amount: &str,
    to_chain_id_wormhole: u16,
    recipient_address: &str,
    nonce: u64,
) -> String {
    format!(
        "Fogo Bridge Transfer:\n\
         Signing this intent will bridge out the tokens as described below.\n\
         \n\
         version: 0.1\n\
         from_chain_id: {}\n\
         to_chain_id_wormhole: {}\n\
         token: {}\n\
         amount: {}\n\
         recipient_address: {}\n\
         nonce: {}",
        from_chain_id,
        to_chain_id_wormhole,
        token_symbol,
        amount,
        recipient_address,
        nonce
    )
}

fn create_ed25519_signature_instruction(signer: &Keypair, message: &str) -> Instruction {
    let signature = signer.sign_message(message.as_bytes());
    let pubkey_bytes = signer.pubkey().to_bytes();
    let signature_bytes = signature.as_ref();

    // Ed25519 signature verification instruction data format:
    let mut instruction_data = vec![
        1, // number of signatures
    ];

    instruction_data.extend_from_slice(&0u8.to_le_bytes()); // padding

    instruction_data.extend_from_slice(&48u16.to_le_bytes()); // signature offset (byte 48)
    instruction_data.extend_from_slice(&u16::MAX.to_le_bytes());    // signature instruction index

    instruction_data.extend_from_slice(&16u16.to_le_bytes()); // pubkey offset (byte 16)
    instruction_data.extend_from_slice(&u16::MAX.to_le_bytes());    // pubkey instruction index

    instruction_data.extend_from_slice(&112u16.to_le_bytes()); // message data offset (byte 112)
    instruction_data.extend_from_slice(&(message.len() as u16).to_le_bytes()); // message data size
    instruction_data.extend_from_slice(&u16::MAX.to_le_bytes());    // message instruction index
    
    instruction_data.extend_from_slice(&pubkey_bytes);
    instruction_data.extend_from_slice(&signature_bytes);
    instruction_data.extend_from_slice(message.as_bytes());

    Instruction {
        program_id: ed25519_program::ID,
        accounts: vec![],
        data: instruction_data,
    }
}

#[test]
fn test_bridge_ntt_tokens_with_mock_wh() {
    let mut svm = LiteSVM::new();

    let spl_token_path = "../../tilt/programs/spl_token.so";
    svm.add_program_from_file(spl_token::ID, spl_token_path)
        .expect("Failed to load custom SPL token program");

    let spl_associated_token_path = "../../tilt/programs/spl_associated_token_account.so";
    svm.add_program_from_file(spl_associated_token_account::ID, spl_associated_token_path)
        .expect("Failed to load custom SPL associated token program");

    let program_path = "../../target/deploy/intent_transfer.so";
    svm.add_program_from_file(intent_transfer::ID, program_path)
        .expect("Failed to load intent_transfer program");

    let mock_ntt_manager_id = Pubkey::new_unique();
    let mock_ntt_manager_path = "../../target/deploy/mock_ntt_manager.so";
    svm.add_program_from_file(&mock_ntt_manager_id, mock_ntt_manager_path)
        .expect("Failed to load mock NTT manager");

    let mock_ntt_with_executor_path = "../../target/deploy/mock_ntt_with_executor.so";
    svm.add_program_from_file(&NTT_WITH_EXECUTOR_PROGRAM_ID, mock_ntt_with_executor_path)
        .expect("Failed to load mock NTT with executor");

    let chain_id_program_path = "../../target/deploy/chain_id.so";
    svm.add_program_from_file(chain_id::ID, chain_id_program_path)
        .expect("Failed to load chain_id program");

    let payer = helpers::generate_and_fund_key(&mut svm);
    let source_owner = helpers::generate_and_fund_key(&mut svm);

    let decimals = 9;
    let token = helpers::Token::create_mint(&mut svm, spl_token::ID, decimals);

    let source_token_account = token.airdrop(&mut svm, &source_owner.pubkey(), 1_000.0);

    let (intent_transfer_setter, _) = Pubkey::find_program_address(
        &[b"intent_transfer"],
        &intent_transfer::ID,
    );

    let (intermediate_token_account, _) = Pubkey::find_program_address(
        &[b"bridge_ntt_intermediate", source_token_account.as_ref()],
        &intent_transfer::ID,
    );

    let (nonce_account, _) = Pubkey::find_program_address(
        &[b"nonce", source_owner.pubkey().as_ref()],
        &intent_transfer::ID,
    );

    let (chain_id_account, _) = Pubkey::find_program_address(
        &[b"chain_id"],
        &chain_id::ID,
    );

    let chain_id_value = "solana".to_string();

    let set_chain_id_ix = Instruction {
        program_id: chain_id::ID,
        accounts: chain_id::accounts::Set {
            chain_id_account,
            sponsor: payer.pubkey(),
            system_program: system_program::ID,
        }.to_account_metas(None),
        data: chain_id::instruction::Set {
            chain_id: chain_id_value.clone(),
        }.data(),
    };

    helpers::submit_transaction(
        &mut svm,
        &[set_chain_id_ix],
        &payer,
        &[&payer],
    ).unwrap();

    let ntt_config = Keypair::new();
    let ntt_inbox_rate_limit = Keypair::new();
    let ntt_token_authority = Keypair::new();

    let wormhole_message = Keypair::new();
    let transceiver = Keypair::new();
    let emitter = Keypair::new();
    let wormhole_bridge = Keypair::new();
    let wormhole_fee_collector = Keypair::new();
    let wormhole_sequence = Keypair::new();
    let ntt_peer = Keypair::new();
    let ntt_outbox_item = Keypair::new();
    let ntt_outbox_rate_limit = Keypair::new();
    let payee_ntt_with_executor = Keypair::new();

    let to_chain_id_wormhole: u16 = 2; // Ethereum
    let recipient_address_str = "0xabcaA90Df87bf36b051E65331594d9AAB29C739e";
    let amount_str = "0.0001";

    let amount = try_ui_amount_into_amount(amount_str.parse().unwrap(), decimals).unwrap();
    let should_queue = false;

    let recipient_hex = recipient_address_str.strip_prefix("0x").unwrap_or(recipient_address_str);
    let recipient_bytes_vec = hex::decode(recipient_hex).unwrap();
    let mut recipient_address_bytes = [0u8; 32];
    let start_idx = 32 - recipient_bytes_vec.len();
    recipient_address_bytes[start_idx..].copy_from_slice(&recipient_bytes_vec);

    let args_hash = keccak::hashv(&[
        &amount.to_be_bytes().as_ref(),
        to_chain_id_wormhole.to_be_bytes().as_ref(),
        &recipient_address_bytes,
        &[u8::from(should_queue)]
    ]);

    let (ntt_session_authority, _) = Pubkey::find_program_address(
        &[
            b"session_authority",
            intent_transfer_setter.as_ref(), // Owner of intermediate token account = intent transfer setter
            args_hash.as_ref(),
        ],
        &mock_ntt_manager_id,
    );

    // Airdrop to NTT accounts that might need lamports
    for account in [
        &ntt_config,
        &transceiver,
        &wormhole_bridge,
        &wormhole_fee_collector,
        &payee_ntt_with_executor,
    ] {
        svm.airdrop(&account.pubkey(), 1_000_000_000).unwrap();
    }

    let ntt_custody = token.create_token_account(&mut svm, &mock_ntt_manager_id);

    let message = create_ntt_bridge_message(
        &chain_id_value,
        &token.mint.to_string(),
        amount_str,
        to_chain_id_wormhole,
        recipient_address_str,
        1,
    );

    let ed25519_ix = create_ed25519_signature_instruction(&source_owner, &message);

    let bridge_ix = Instruction {
        program_id: intent_transfer::ID,
        accounts: intent_transfer::accounts::BridgeNttTokens {
            from_chain_id: chain_id_account,
            sysvar_instructions: sysvar::instructions::ID,
            intent_transfer_setter,
            token_program: spl_token::ID,
            source: source_token_account,
            intermediate_token_account,
            mint: token.mint,
            // metadata is None
            metadata: Some(intent_transfer::ID),
            nonce: nonce_account,
            sponsor: payer.pubkey(),
            system_program: anchor_lang::solana_program::system_program::ID,
            clock: sysvar::clock::ID,
            rent: sysvar::rent::ID,
            ntt: intent_transfer::accounts::Ntt {
                ntt_manager: mock_ntt_manager_id,
                ntt_config: ntt_config.pubkey(),
                ntt_inbox_rate_limit: ntt_inbox_rate_limit.pubkey(),
                ntt_session_authority: ntt_session_authority,
                ntt_token_authority: ntt_token_authority.pubkey(),
                wormhole_message: wormhole_message.pubkey(),
                transceiver: transceiver.pubkey(),
                emitter: emitter.pubkey(),
                wormhole_bridge: wormhole_bridge.pubkey(),
                wormhole_fee_collector: wormhole_fee_collector.pubkey(),
                wormhole_sequence: wormhole_sequence.pubkey(),
                wormhole_program: WORMHOLE_PROGRAM_ID,
                ntt_with_executor_program: NTT_WITH_EXECUTOR_PROGRAM_ID,
                executor_program: EXECUTOR_PROGRAM_ID,
                ntt_peer: ntt_peer.pubkey(),
                ntt_outbox_item: ntt_outbox_item.pubkey(),
                ntt_outbox_rate_limit: ntt_outbox_rate_limit.pubkey(),
                ntt_custody,
                payee_ntt_with_executor: payee_ntt_with_executor.pubkey(),
            }
        }.to_account_metas(None),
        data: intent_transfer::instruction::BridgeNttTokens {
            args: intent_transfer::BridgeNttTokensArgs {
                exec_amount: 1_000,
                signed_quote_bytes: vec![],
                relay_instructions: vec![],
            },
        }.data(),
    };

    let transfer_amount = token.get_amount_with_decimals(amount_str.parse::<f64>().unwrap());
    let source_balance_before = token.get_balance(&svm, &source_token_account);
    let custody_balance_before = token.get_balance(&svm, &ntt_custody);

    let tx = Transaction::new_signed_with_payer(
        &[ed25519_ix, bridge_ix],
        Some(&payer.pubkey()),
        &[&payer, &ntt_outbox_item],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);

    match result {
        Ok(meta) => {
            let logs = meta.logs;
            println!("Transaction logs:");
            for log in &logs {
                println!("  {}", log);
            }

            let has_transfer_burn = logs.iter().any(|log| log.contains("transfer_burn"));
            let has_release_outbound = logs.iter().any(|log| log.contains("release_wormhole_outbound"));
            let has_relay_message = logs.iter().any(|log| log.contains("relay_ntt_message"));

            println!("CPI Verification:");
            println!("  {} transfer_burn called", if has_transfer_burn { "✓" } else { "✗" });
            println!("  {} release_wormhole_outbound called", if has_release_outbound { "✓" } else { "✗" });
            println!("  {} relay_ntt_message called", if has_relay_message { "✓" } else { "✗" });

            let source_balance_after = token.get_balance(&svm, &source_token_account);
            let intermediate_balance_after = token.get_balance(&svm, &intermediate_token_account);
            let custody_balance_after = token.get_balance(&svm, &ntt_custody);

            let source_delta = source_balance_before.saturating_sub(source_balance_after);
            let custody_delta = custody_balance_after.saturating_sub(custody_balance_before);

            assert_eq!(
                source_delta, transfer_amount,
                "Source balance should decrease by transfer amount. Expected: {}, Got: {}",
                transfer_amount, source_delta
            );

            // Intermediate should remain at 0 since tokens are transferred to custody
            assert_eq!(
                intermediate_balance_after, 0,
                "Intermediate balance should be 0 after transfer to custody. Got: {}",
                intermediate_balance_after
            );

            assert_eq!(
                custody_delta, transfer_amount,
                "Custody balance should increase by transfer amount. Expected: {}, Got: {}",
                transfer_amount, custody_delta
            );
        }
        Err(e) => {
            println!("Transaction failed: {:?}", e);
        }
    }
}
