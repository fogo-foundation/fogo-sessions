import {
  fromLegacyPublicKey,
  fromLegacyTransactionInstruction,
  fromVersionedTransaction,
} from "@solana/compat";
import type {
  Transaction,
  Instruction,
  Blockhash,
  TransactionWithLifetime,
} from "@solana/kit";
import {
  createSolanaRpc,
  getBase64EncodedWireTransaction,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  partiallySignTransactionMessageWithSigners,
  pipe,
  addSignersToTransactionMessage,
  compressTransactionMessageUsingAddressLookupTables,
  createSignerFromKeyPair,
  partiallySignTransaction,
} from "@solana/kit";
import type {
  AddressLookupTableAccount,
  TransactionError,
} from "@solana/web3.js";
import {
  Connection as Web3Connection,
  TransactionInstruction,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import { z } from "zod";

export enum Network {
  Testnet,
  Mainnet,
}

export const DEFAULT_RPC = {
  [Network.Testnet]: "https://testnet.fogo.io",
  [Network.Mainnet]: "https://mainnet.fogo.io",
};

export const DEFAULT_PAYMASTER = {
  [Network.Testnet]: "https://paymaster.fogo.io",
  [Network.Mainnet]: "https://paymaster.dourolabs.app",
};

const DEFAULT_ADDRESS_LOOKUP_TABLE_ADDRESS = {
  [Network.Testnet]: "B8cUjJMqaWWTNNSTXBmeptjWswwCH1gTSCRYv4nu7kJW",
  [Network.Mainnet]: undefined,
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

export const createSessionConnection = (
  options: // This is a bit of a complex type that basically says "you can either
  // specify a network and optionally override the rpc, or you can explicitly
  // specify both the rpc AND the paymaster"
  | {
        network: Network;
        rpc?: string | URL | undefined;
        paymaster?: undefined;
        sendToPaymaster?: undefined;
        sponsor?: undefined;
      }
    | ({
        network?: Network | undefined;
        rpc: string | URL;
      } & (
        | {
            paymaster: string | URL;
            sendToPaymaster?: undefined;
            sponsor?: undefined;
          }
        | {
            paymaster?: undefined;
            sendToPaymaster: (
              transaction: Transaction,
            ) => Promise<TransactionResult>;
            sponsor: PublicKey;
          }
      )),
) => {
  // For some reason, typescript is unable to narrow this type even though it's
  // obvious that `rpc` can only be `undefined` if `network` is defined.  I
  // don't like the non-null assertion, but here we can guarantee it's safe (and
  // typescript really should be able to narrow this...)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const rpcUrl = (options.rpc ?? DEFAULT_RPC[options.network!]).toString();
  const rpc = createSolanaRpc(rpcUrl);
  const connection = new Web3Connection(rpcUrl, "confirmed");

  return {
    rpc,
    connection,
    sendToPaymaster: async (
      domain: string,
      sponsor: PublicKey,
      addressLookupTables: AddressLookupTableAccount[] | undefined,
      sessionKey: CryptoKeyPair | undefined,
      instructions:
        | (TransactionInstruction | Instruction)[]
        | VersionedTransaction
        | (Transaction & TransactionWithLifetime),
    ) => {
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
      const transaction = await buildTransaction(
        latestBlockhash,
        sessionKey,
        sponsor,
        instructions,
        addressLookupTables,
      );
      return sendToPaymaster(options, domain, transaction);
    },
    getSponsor: (domain: string) => getSponsor(options, domain),
    getAddressLookupTables: (addressLookupTableAddress?: string) =>
      getAddressLookupTables(options, connection, addressLookupTableAddress),
  };
};

export type Connection = ReturnType<typeof createSessionConnection>;

const sendToPaymaster = async (
  options: Parameters<typeof createSessionConnection>[0],
  domain: string,
  transaction: Transaction,
): Promise<TransactionResult> => {
  if (options.sendToPaymaster === undefined) {
    const url = new URL(
      "/api/sponsor_and_send",
      options.paymaster ?? DEFAULT_PAYMASTER[options.network],
    );
    url.searchParams.set("domain", domain);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: getBase64EncodedWireTransaction(transaction),
      }),
    });

    if (response.status === 200) {
      return sponsorAndSendResponseSchema.parse(await response.json());
    } else {
      throw new PaymasterResponseError(response.status, await response.text());
    }
  } else {
    return options.sendToPaymaster(transaction);
  }
};

const buildTransaction = async (
  latestBlockhash: Readonly<{
    blockhash: Blockhash;
    lastValidBlockHeight: bigint;
  }>,
  sessionKey: CryptoKeyPair | undefined,
  sponsor: PublicKey,
  instructions:
    | (TransactionInstruction | Instruction)[]
    | VersionedTransaction
    | (Transaction & TransactionWithLifetime),
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
        ? (fromVersionedTransaction(instructions) as ReturnType<
            typeof fromVersionedTransaction
          > &
            TransactionWithLifetime) // VersionedTransaction has a lifetime so it's fine to cast it so we can call partiallySignTransaction
        : instructions;
    return sessionKey === undefined
      ? tx
      : partiallySignTransaction([sessionKey], tx);
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
      error: z.object({
        InstructionError: z.tuple([z.number(), z.unknown()]),
      }),
    }),
  ])
  .transform((data) => {
    return data.type === "success"
      ? TransactionResult.Success(data.signature)
      : TransactionResult.Failed(data.signature, data.error);
  });

const getSponsor = async (
  options: Parameters<typeof createSessionConnection>[0],
  domain: string,
) => {
  if (options.sponsor === undefined) {
    const url = new URL(
      "/api/sponsor_pubkey",
      options.paymaster ?? DEFAULT_PAYMASTER[options.network],
    );
    url.searchParams.set("domain", domain);
    const response = await fetch(url);

    if (response.status === 200) {
      return new PublicKey(z.string().parse(await response.text()));
    } else {
      throw new PaymasterResponseError(response.status, await response.text());
    }
  } else {
    return options.sponsor;
  }
};

const getAddressLookupTables = async (
  options: Parameters<typeof createSessionConnection>[0],
  connection: Web3Connection,
  addressLookupTableAddress?: string,
) => {
  const altAddress =
    addressLookupTableAddress ??
    (options.network === undefined
      ? undefined
      : DEFAULT_ADDRESS_LOOKUP_TABLE_ADDRESS[options.network]);
  if (altAddress) {
    const addressLookupTableResult = await connection.getAddressLookupTable(
      new PublicKey(altAddress),
    );
    return addressLookupTableResult.value
      ? [addressLookupTableResult.value]
      : undefined;
  } else {
    return;
  }
};

class PaymasterResponseError extends Error {
  constructor(statusCode: number, message: string) {
    super(`Paymaster sent a ${statusCode.toString()} response: ${message}`);
    this.name = "PaymasterResponseError";
  }
}
