import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import {
  type PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

const SESION_WRAP_DISCRIMINATOR = 4_000_000;

function getNativeMintAssociatedTokenAddressSync(walletPublicKey: PublicKey) {
  return getAssociatedTokenAddressSync(NATIVE_MINT, walletPublicKey);
}

export function createSessionWrapInstruction(
  sessionKey: PublicKey,
  walletPublicKey: PublicKey,
  amount: bigint,
) {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, SESION_WRAP_DISCRIMINATOR, true);
  view.setBigUint64(4, amount, true);

  return new TransactionInstruction({
    programId: SystemProgram.programId,
    keys: [
      { pubkey: walletPublicKey, isSigner: false, isWritable: true },
      { pubkey: getNativeMintAssociatedTokenAddressSync(walletPublicKey), isSigner: false, isWritable: true },
      { pubkey: sessionKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

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
    createSessionWrapInstruction(sessionKey, walletPublicKey, amount),
    createAssociatedTokenAccountIdempotentInstruction(
      sessionKey,
      userTokenAccount,
      walletPublicKey,
      NATIVE_MINT,
    ),
    createSyncNativeInstruction(userTokenAccount),
  ];
}

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
