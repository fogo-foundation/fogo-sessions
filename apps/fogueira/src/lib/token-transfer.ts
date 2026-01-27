import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

/**
 * Build a token transfer transaction
 */
export async function buildTokenTransferTransaction(
  connection: Connection,
  fromWallet: PublicKey,
  toWallet: PublicKey,
  tokenMint: PublicKey,
  amount: bigint,
): Promise<Transaction> {
  // Get associated token accounts
  const fromTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    fromWallet,
  );

  const toTokenAccount = await getAssociatedTokenAddress(tokenMint, toWallet);

  // Check if destination token account exists
  const toAccountInfo = await connection.getAccountInfo(toTokenAccount);

  const transaction = new Transaction();

  // If destination token account doesn't exist, create it
  if (!toAccountInfo) {
    const createAccountIx = createAssociatedTokenAccountInstruction(
      fromWallet,
      toTokenAccount,
      toWallet,
      tokenMint,
    );
    transaction.add(createAccountIx);
  }

  // Add transfer instruction
  const transferIx = createTransferInstruction(
    fromTokenAccount,
    toTokenAccount,
    fromWallet,
    amount,
    [],
    TOKEN_PROGRAM_ID,
  );

  transaction.add(transferIx);

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromWallet;

  return transaction;
}

/**
 * Helper to create associated token account instruction
 */
function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
): TransactionInstruction {
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  );

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.alloc(0),
  });
}

