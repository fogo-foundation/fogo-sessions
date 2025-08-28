import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { ChainIdProgram } from "@fogo/sessions-idls";
import {
  fromLegacyPublicKey,
  fromLegacyTransactionInstruction,
  fromVersionedTransaction,
} from "@solana/compat";
import type { Transaction, IInstruction, Blockhash } from "@solana/kit";
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
  partiallySignTransaction,
} from "@solana/kit";
import type {
  AddressLookupTableAccount,
  Connection,
  TransactionError,
} from "@solana/web3.js";
import {
  PublicKey,
  Keypair,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";
import { z } from "zod";

// eslint-disable-next-line unicorn/no-typeof-undefined
const IS_BROWSER = typeof globalThis.window !== "undefined";
const DEFAULT_PAYMASTER = "https://paymaster.fogo.io";
const DEFAULT_ADDRESS_LOOKUP_TABLE_ADDRESS =
  "B8cUjJMqaWWTNNSTXBmeptjWswwCH1gTSCRYv4nu7kJW";

export type SessionAdapter = {
  chainId: string;
  connection: Connection;
  payer: PublicKey;
  domain: string;
  sendTransaction: (
    sessionKey: CryptoKeyPair | undefined,
    instructions:
      | (TransactionInstruction | IInstruction)[]
      | VersionedTransaction
      | Transaction,
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

export const createSolanaWalletAdapter = async (
  options: {
    connection: Connection;
    addressLookupTableAddress?: string | undefined;
    domain?: string | undefined;
  } & (
    | {
        paymaster?: string | URL | undefined;
      }
    | {
        sendToPaymaster: (
          transaction: Transaction,
        ) => Promise<TransactionResult>;
        sponsor: PublicKey;
      }
  ),
): Promise<SessionAdapter> => {
  const addressLookupTables = await getAddressLookupTables(
    options.connection,
    options.addressLookupTableAddress,
  );
  const sponsor = await getSponsor(options);
  return {
    connection: options.connection,
    payer: sponsor,
    chainId: await fetchChainId(options.connection),
    domain: getDomain(options.domain),
    sendTransaction: async (sessionKey, instructions) => {
      const rpc = createSolanaRpc(options.connection.rpcEndpoint);
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
      return await sendToPaymaster(
        options,
        await buildTransaction(
          latestBlockhash,
          sessionKey,
          sponsor,
          instructions,
          addressLookupTables,
        ),
      );
    },
  };
};

const buildTransaction = async (
  latestBlockhash: Readonly<{
    blockhash: Blockhash;
    lastValidBlockHeight: bigint;
  }>,
  sessionKey: CryptoKeyPair | undefined,
  sponsor: PublicKey,
  instructions:
    | (TransactionInstruction | IInstruction)[]
    | VersionedTransaction
    | Transaction,
  addressLookupTables: AddressLookupTableAccount[] | undefined,
) => {
  const sessionKeySigner = sessionKey
    ? await createSignerFromKeyPair(sessionKey)
    : undefined;

  if (Array.isArray(instructions)) {
    return partiallySignTransactionMessageWithSigners(
      pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(fromLegacyPublicKey(sponsor), tx),
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) =>
          appendTransactionMessageInstructions(
            instructions.map((instruction) =>
              instruction instanceof TransactionInstruction
                ? fromLegacyTransactionInstruction(instruction)
                : instruction,
            ),
            tx,
          ),
        (tx) =>
          compressTransactionMessageUsingAddressLookupTables(
            tx,
            Object.fromEntries(
              addressLookupTables?.map(
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
        (tx) =>
          sessionKeySigner === undefined
            ? tx
            : addSignersToTransactionMessage([sessionKeySigner], tx),
      ),
    );
  } else {
    const tx =
      instructions instanceof VersionedTransaction
        ? fromVersionedTransaction(instructions)
        : instructions;
    return sessionKey === undefined
      ? tx
      : partiallySignTransaction([sessionKey], tx);
  }
};

const getSponsor = async (
  options: Parameters<typeof createSolanaWalletAdapter>[0],
) => {
  if ("sponsor" in options) {
    return options.sponsor;
  } else {
    const response = await fetch(
      new URL("/api/sponsor_pubkey", options.paymaster ?? DEFAULT_PAYMASTER),
    );
    return new PublicKey(z.string().parse(await response.text()));
  }
};

const sponsorAndSendResponseSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("success"),
      signature: z.string(),
    }),
    z.object({
      type: z.literal("failed"),
      signature: z.string(),
      error: z.object({}),
    }),
  ])
  .transform((data) => {
    return data.type === "success"
      ? TransactionResult.Success(data.signature)
      : TransactionResult.Failed(data.signature, data.error);
  });

const sendToPaymaster = async (
  options: Parameters<typeof createSolanaWalletAdapter>[0],
  transaction: Transaction,
): Promise<TransactionResult> => {
  if ("sendToPaymaster" in options) {
    return options.sendToPaymaster(transaction);
  } else {
    const response = await fetch(
      new URL(
        "/api/sponsor_and_send?confirm=true",
        options.paymaster ?? DEFAULT_PAYMASTER,
      ),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction: getBase64EncodedWireTransaction(transaction),
        }),
      },
    );

    if (response.status === 200) {
      return sponsorAndSendResponseSchema.parse(await response.json());
    } else {
      throw new PaymasterResponseError(response.status, await response.text());
    }
  }
};

const getAddressLookupTables = async (
  connection: Connection,
  addressLookupTableAddress: string = DEFAULT_ADDRESS_LOOKUP_TABLE_ADDRESS,
) => {
  const addressLookupTableResult = await connection.getAddressLookupTable(
    new PublicKey(addressLookupTableAddress),
  );
  return addressLookupTableResult.value
    ? [addressLookupTableResult.value]
    : undefined;
};

const fetchChainId = async (connection: Connection) => {
  const chainIdProgram = new ChainIdProgram(
    new AnchorProvider(
      connection,
      { publicKey: new Keypair().publicKey } as Wallet,
      {},
    ),
  ); // We mock the wallet because we don't need to sign anything
  const { chainIdAccount: chainIdAddress } = await chainIdProgram.methods
    .set("")
    .pubkeys(); // We use Anchor to derive the chain ID address, not caring about the actual argument of `set`
  if (chainIdAddress === undefined) {
    throw new NoChainIdAddressError();
  }
  const chainId = await chainIdProgram.account.chainId.fetch(chainIdAddress);
  return chainId.chainId;
};

const getDomain = (requestedDomain?: string) => {
  const detectedDomain = IS_BROWSER ? globalThis.location.origin : undefined;

  if (requestedDomain === undefined) {
    if (detectedDomain === undefined) {
      throw new DomainRequiredError();
    } else {
      return detectedDomain;
    }
  } else {
    return requestedDomain;
  }
};

class PaymasterResponseError extends Error {
  constructor(statusCode: number, message: string) {
    super(`Paymaster sent a ${statusCode.toString()} response: ${message}`);
    this.name = "PaymasterResponseError";
  }
}

class NoChainIdAddressError extends Error {
  constructor() {
    super("Failed to derive chain ID address");
    this.name = "NoChainIdAddressError";
  }
}

class DomainRequiredError extends Error {
  constructor() {
    super(
      "On platforms where the origin cannot be determined, you must pass a domain to create a session.",
    );
    this.name = "DomainRequiredError";
  }
}
