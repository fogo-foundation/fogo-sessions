import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { TollboothIdl, TollboothProgram } from "@fogo/sessions-idls";
import { sha256 } from "@noble/hashes/sha2";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import type BN from "bn.js";

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

const getDomainTollRecipientAddress = (domain: string) => {
  const hash = sha256(domain);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("toll_recipient"), Buffer.from([0]), hash],
    new PublicKey(TollboothIdl.address),
  )[0];
};

/**
 * Creates the instruction required to pay the paymaster fee for a transaction.
 * This instruction is only required if the transaction variation has a fee and may be placed anywhere in the instruction list.
 * The fee amount for a variation in a given token can be retrieved using the `getPaymasterFee` function.
 */
export const createPaymasterFeeInstruction = ({
  sessionKey,
  walletPublicKey,
  domain,
  feeMint,
  feeAmount,
}: {
  sessionKey: PublicKey;
  walletPublicKey: PublicKey;
  domain: string;
  feeMint: PublicKey;
  feeAmount: BN;
}): Promise<TransactionInstruction> => {
  const recipient = getDomainTollRecipientAddress(domain);
  return new TollboothProgram(
    new AnchorProvider({} as Connection, {} as Wallet),
  ).methods
    .payToll(feeAmount, 0)
    .accounts({
      session: sessionKey,
      source: getAssociatedTokenAddressSync(feeMint, walletPublicKey),
      destination: getAssociatedTokenAddressSync(feeMint, recipient, true),
      mint: feeMint,
    })
    .instruction();
};
