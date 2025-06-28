import type {
  Connection,
  PublicKey,
  Keypair,
  TransactionError,
  TransactionInstruction,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";

export type SessionAdapter = {
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  publicKey: PublicKey;
  connection: Connection;
  payer: PublicKey;
  sendTransaction: (
    sessionKey: Keypair,
    instructions: TransactionInstruction[],
  ) => Promise<TransactionResult>;
};

export enum TransactionResultType {
  Success,
  Failed,
}

const TransactionResult = {
  Success: (signature: string) => ({
    type: TransactionResultType.Success as const,
    signature,
  }),
  Failed: (signature: string, error: TransactionError) => ({
    type: TransactionResultType.Failed as const,
    signature,
    error,
  }),
};

export type TransactionResult = ReturnType<
  (typeof TransactionResult)[keyof typeof TransactionResult]
>;

export const createSolanaWalletAdapter = (
  options: {
    connection: Connection;
    publicKey: PublicKey;
    signMessage: SessionAdapter["signMessage"];
    sponsor: PublicKey;
    addressLookupTables?: AddressLookupTableAccount[] | undefined;
  } & (
    | {
        paymasterUrl: string;
      }
    | {
        sendToPaymaster: (transaction: VersionedTransaction) => Promise<string>;
      }
  ),
): SessionAdapter => ({
  publicKey: options.publicKey,
  signMessage: options.signMessage,
  connection: options.connection,
  payer: options.sponsor,
  sendTransaction: async (
    sessionKey: Keypair,
    instructions: TransactionInstruction[],
  ) => {
    const { blockhash } = await options.connection.getLatestBlockhash();

    const transaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: options.sponsor,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message(options.addressLookupTables ?? []),
    );

    transaction.sign([sessionKey]);

    const signature =
      "sendToPaymaster" in options
        ? await options.sendToPaymaster(transaction)
        : await sendToPaymaster(options.paymasterUrl, transaction);

    const lastValidBlockHeight = await options.connection.getSlot();
    const confirmationResult = await options.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    return confirmationResult.value.err === null
      ? TransactionResult.Success(signature)
      : TransactionResult.Failed(signature, confirmationResult.value.err);
  },
});

const sendToPaymaster = async (
  paymasterUrl: string,
  transaction: VersionedTransaction,
) => {
  const response = await fetch(paymasterUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: Buffer.from(transaction.serialize()).toString("base64"),
    }),
  });

  if (response.status === 200) {
    return response.text();
  } else {
    throw new Error(await response.text());
  }
};
