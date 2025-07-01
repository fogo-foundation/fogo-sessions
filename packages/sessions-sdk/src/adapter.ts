import {
  fromLegacyPublicKey,
  fromLegacyTransactionInstruction,
} from "@solana/compat";
import type { Transaction } from "@solana/kit";
import {
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  getBase64EncodedWireTransaction,
  partiallySignTransactionMessageWithSigners,
  pipe,
  createSolanaRpc,
  addSignersToTransactionMessage,
  compressTransactionMessageUsingAddressLookupTables,
  createSignerFromKeyPair,
} from "@solana/kit";
import type {
  Connection,
  PublicKey,
  TransactionError,
  TransactionInstruction,
  AddressLookupTableAccount,
} from "@solana/web3.js";

export type SessionAdapter = {
  signMessage?: ((message: Uint8Array) => Promise<Uint8Array>) | undefined;
  connection: Connection;
  payer: PublicKey;
  sendTransaction: (
    sessionKey: CryptoKeyPair,
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
    signMessage?: SessionAdapter["signMessage"];
    sponsor: PublicKey;
    addressLookupTables?: AddressLookupTableAccount[] | undefined;
  } & (
    | {
        paymasterUrl: string;
      }
    | {
        sendToPaymaster: (transaction: Transaction) => Promise<string>;
      }
  ),
): SessionAdapter => ({
  signMessage: options.signMessage,
  connection: options.connection,
  payer: options.sponsor,
  sendTransaction: async (
    sessionKey: CryptoKeyPair,
    instructions: TransactionInstruction[],
  ) => {
    const rpc = createSolanaRpc(options.connection.rpcEndpoint);
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const sessionKeySigner = await createSignerFromKeyPair(sessionKey);

    const transaction = await partiallySignTransactionMessageWithSigners(
      pipe(
        createTransactionMessage({ version: 0 }),
        (tx) =>
          setTransactionMessageFeePayer(
            fromLegacyPublicKey(options.sponsor),
            tx,
          ),
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) =>
          appendTransactionMessageInstructions(
            instructions.map((instruction) =>
              fromLegacyTransactionInstruction(instruction),
            ),
            tx,
          ),
        (tx) =>
          compressTransactionMessageUsingAddressLookupTables(
            tx,
            Object.fromEntries(
              options.addressLookupTables?.map(
                (table) =>
                  [
                    fromLegacyPublicKey(table.key),
                    table.state.addresses.map((address) =>
                      fromLegacyPublicKey(address),
                    ),
                  ] as const,
              ) ?? [],
            ),
          ),
        (tx) => addSignersToTransactionMessage([sessionKeySigner], tx),
      ),
    );

    const signature =
      "sendToPaymaster" in options
        ? await options.sendToPaymaster(transaction)
        : await sendToPaymaster(options.paymasterUrl, transaction);

    const lastValidBlockHeight = await rpc.getSlot().send();
    const confirmationResult = await options.connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash.toString(),
      lastValidBlockHeight: Number(lastValidBlockHeight),
    });

    return confirmationResult.value.err === null
      ? TransactionResult.Success(signature)
      : TransactionResult.Failed(signature, confirmationResult.value.err);
  },
});

const sendToPaymaster = async (
  paymasterUrl: string,
  transaction: Transaction,
) => {
  const response = await fetch(paymasterUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: getBase64EncodedWireTransaction(transaction),
    }),
  });

  if (response.status === 200) {
    return response.text();
  } else {
    throw new Error(await response.text());
  }
};
