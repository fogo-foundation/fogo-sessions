import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { SystemProgram, TransactionInstruction } from "@solana/web3.js";

const SESSION_WRAP_DISCRIMINATOR = 4_000_000;

function getNativeMintAssociatedTokenAddressSync(walletPublicKey: PublicKey) {
  return getAssociatedTokenAddressSync(NATIVE_MINT, walletPublicKey);
}

/**
 * Creates the system program instruction `SessionWrap`, only available on Fogo, which allows a session key to transfer native token from its user's wallet to its user's wrapped token associated token account.
 * This instruction may be combined with the `CreateAssociatedTokenAccountIdempotent` and `SyncNative` instructions for a session to wrap tokens on behalf of its user.
 */
export function createSystemProgramSessionWrapInstruction(
  sessionKey: PublicKey,
  walletPublicKey: PublicKey,
  amount: bigint,
) {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, SESSION_WRAP_DISCRIMINATOR, true);
  view.setBigUint64(4, amount, true);

  return new TransactionInstruction({
    programId: SystemProgram.programId,
    keys: [
      { pubkey: walletPublicKey, isSigner: false, isWritable: true },
      {
        pubkey: getNativeMintAssociatedTokenAddressSync(walletPublicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: sessionKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

/**
 * Creates the sequence of instructions required to wrap native tokens within a session.
 *
 * Note: This function sets the session key as the payer for the `CreateAssociatedTokenAccountIdempotent` instruction, which is unconventional since the session key can't spend funds.
 * It works because at the time `CreateAssociatedTokenAccountIdempotent` is called, the `userTokenAccount` has already been funded by the `SessionWrap` instruction.
 * The paymaster will reject the transaction if the payer of the `CreateAssociatedTokenAccountIdempotent` is set to the paymaster payer to avoid the paymaster's funds getting drained.
 */
export function createSessionWrapInstructions(
  sessionKey: PublicKey,
  walletPublicKey: PublicKey,
  amount: bigint,
) {
  const userTokenAccount = getAssociatedTokenAddressSync(
    NATIVE_MINT,
    walletPublicKey,
  );

  return [
    createSystemProgramSessionWrapInstruction(
      sessionKey,
      walletPublicKey,
      amount,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      sessionKey, // This is unconventional! Read the note in the function's docs.
      userTokenAccount,
      walletPublicKey,
      NATIVE_MINT,
    ),
    createSyncNativeInstruction(userTokenAccount),
  ];
}

/**
 * Creates the instruction required to unwrap native tokens within a session.
 */
export function createSessionUnwrapInstruction(
  sessionKey: PublicKey,
  walletPublicKey: PublicKey,
) {
  return createCloseAccountInstruction(
    getNativeMintAssociatedTokenAddressSync(walletPublicKey),
    walletPublicKey,
    sessionKey,
  );
}
