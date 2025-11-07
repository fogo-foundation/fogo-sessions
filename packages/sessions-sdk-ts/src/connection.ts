import {
  fromLegacyKeypair,
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
  Keypair,
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

const DEFAULT_RPC = {
  [Network.Testnet]: "https://testnet.fogo.io",
  [Network.Mainnet]: "https://mainnet.fogo.io",
};

const DEFAULT_PAYMASTER = {
  [Network.Testnet]: "https://paymaster.fogo.io",
  [Network.Mainnet]: "https://paymaster.dourolabs.app",
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
  options: {
    network: Network;
    rpc: string | URL | undefined;
  } & (
    | {
        paymaster?: string | URL | undefined;
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
  ),
) => {
  const rpcUrl = (options.rpc ?? DEFAULT_RPC[options.network]).toString();
  const rpc = createSolanaRpc(rpcUrl);
  const connection = new Web3Connection(rpcUrl, "confirmed");
  const addressLookupTableCache = new Map<string, AddressLookupTableAccount>();

  return {
    rpc,
    connection,
    network: options.network,
    getSolanaConnection: createSolanaConnectionGetter(options.network),
    sendToPaymaster: async (
      domain: string,
      sponsor: PublicKey,
      sessionKey: CryptoKeyPair | undefined,
      instructions:
        | (TransactionInstruction | Instruction)[]
        | VersionedTransaction
        | (Transaction & TransactionWithLifetime),
      extraConfig?: {
        addressLookupTable?: string | undefined;
        extraSigners?: (CryptoKeyPair | Keypair)[] | undefined;
      },
    ) => {
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
      const transaction = await buildTransaction(
        connection,
        latestBlockhash,
        sessionKey,
        sponsor,
        instructions,
        addressLookupTableCache,
        extraConfig,
      );
      return sendToPaymaster(options, domain, transaction);
    },
    getSponsor: (domain: string) => getSponsor(options, domain),
  };
};

export type Connection = ReturnType<typeof createSessionConnection>;

const createSolanaConnectionGetter = (network: Network) => {
  let connection: Web3Connection | undefined;
  return async () => {
    if (connection === undefined) {
      const url = new URL("https://api.fogo.io/api/solana-rpc");
      url.searchParams.set("network", NETWORK_TO_QUERY_PARAM[network]);
      const rpcUrlRes = await fetch(url);
      if (rpcUrlRes.status === 200) {
        const rpcUrl = await rpcUrlRes.text();
        connection = new Web3Connection(rpcUrl);
      } else {
        throw new Error("Failed to resolve Solana RPC url");
      }
    }
    return connection;
  };
};

const NETWORK_TO_QUERY_PARAM = {
  [Network.Mainnet]: "mainnet",
  [Network.Testnet]: "testnet",
};

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
  connection: Web3Connection,
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
  addressLookupTableCache: Map<string, AddressLookupTableAccount>,
  extraConfig?: {
    addressLookupTable?: string | undefined;
    extraSigners?: (CryptoKeyPair | Keypair)[] | undefined;
  },
) => {
  const [signerKeys, addressLookupTable] = await Promise.all([
    getSignerKeys(sessionKey, extraConfig?.extraSigners),
    extraConfig?.addressLookupTable === undefined
      ? Promise.resolve(undefined)
      : getAddressLookupTable(
          connection,
          addressLookupTableCache,
          extraConfig.addressLookupTable,
        ),
  ]);

  if (Array.isArray(instructions)) {
    const signers = await Promise.all(
      signerKeys.map((signer) => createSignerFromKeyPair(signer)),
    );

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
          addressLookupTable === undefined
            ? tx
            : compressTransactionMessageUsingAddressLookupTables(tx, {
                [fromLegacyPublicKey(addressLookupTable.key)]:
                  addressLookupTable.state.addresses.map((address) =>
                    fromLegacyPublicKey(address),
                  ),
              }),
        (tx) => addSignersToTransactionMessage(signers, tx),
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
    return partiallySignTransaction(signerKeys, tx);
  }
};

const getSignerKeys = async (
  sessionKey: CryptoKeyPair | undefined,
  extraSigners?: (CryptoKeyPair | Keypair)[],
) => {
  const extraSignerKeys =
    extraSigners === undefined
      ? []
      : await Promise.all(
          extraSigners.map((signer) =>
            signer instanceof Keypair ? fromLegacyKeypair(signer) : signer,
          ),
        );
  return [
    ...extraSignerKeys,
    ...(sessionKey === undefined ? [] : [sessionKey]),
  ];
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

const getAddressLookupTable = async (
  connection: Web3Connection,
  addressLookupTableCache: Map<string, AddressLookupTableAccount>,
  addressLookupTableAddress: string,
) => {
  const value = addressLookupTableCache.get(addressLookupTableAddress);
  if (value === undefined) {
    const result = await connection.getAddressLookupTable(
      new PublicKey(addressLookupTableAddress),
    );
    if (result.value === null) {
      return;
    } else {
      addressLookupTableCache.set(addressLookupTableAddress, result.value);
      return result.value;
    }
  } else {
    return value;
  }
};

class PaymasterResponseError extends Error {
  constructor(statusCode: number, message: string) {
    super(`Paymaster sent a ${statusCode.toString()} response: ${message}`);
    this.name = "PaymasterResponseError";
  }
}
