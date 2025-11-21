import {
  fromLegacyKeypair,
  fromLegacyPublicKey,
  fromLegacyTransactionInstruction,
  fromVersionedTransaction,
} from "@solana/compat";
import type {
  Transaction,
  Instruction,
  TransactionWithLifetime,
  Rpc,
  GetLatestBlockhashApi,
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
    rpc?: string | URL | undefined;
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
  const sponsorCache = new Map<string, PublicKey>();

  return {
    rpc,
    connection,
    network: options.network,
    getSolanaConnection: createSolanaConnectionGetter(options.network),
    sendToPaymaster: async (
      domain: string,
      sessionKey: CryptoKeyPair | undefined,
      instructions: TransactionOrInstructions,
      extraConfig?: SendTransactionOptions,
    ) =>
      sendToPaymaster(
        { ...options, rpc, connection, addressLookupTableCache, sponsorCache },
        domain,
        sessionKey,
        instructions,
        extraConfig,
      ),
    getSponsor: (domain: string) => getSponsor(options, sponsorCache, domain),
  };
};

export type TransactionOrInstructions =
  | (TransactionInstruction | Instruction)[]
  | VersionedTransaction
  | (Transaction & TransactionWithLifetime);

export type SendTransactionOptions = {
  variation?: string | undefined;
  addressLookupTable?: string | undefined;
  extraSigners?: (CryptoKeyPair | Keypair)[] | undefined;
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
  connection: Pick<
    Parameters<typeof createSessionConnection>[0],
    "paymaster" | "network" | "sponsor" | "sendToPaymaster"
  > & {
    rpc: Rpc<GetLatestBlockhashApi>;
    connection: Web3Connection;
    addressLookupTableCache: Map<string, AddressLookupTableAccount>;
    sponsorCache: Map<string, PublicKey>;
  },
  domain: string,
  sessionKey: CryptoKeyPair | undefined,
  instructions: TransactionOrInstructions,
  extraConfig?: SendTransactionOptions,
): Promise<TransactionResult> => {
  const signerKeys = await getSignerKeys(sessionKey, extraConfig?.extraSigners);

  const transaction = Array.isArray(instructions)
    ? await buildTransaction(
        connection,
        domain,
        signerKeys,
        instructions,
        extraConfig,
      )
    : await addSignaturesToExistingTransaction(instructions, signerKeys);

  if (connection.sendToPaymaster === undefined) {
    const url = new URL(
      "/api/sponsor_and_send",
      connection.paymaster ?? DEFAULT_PAYMASTER[connection.network],
    );
    url.searchParams.set("domain", domain);
    if (extraConfig?.variation !== undefined) {
      url.searchParams.set("variation", extraConfig.variation);
    }
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
    return connection.sendToPaymaster(transaction);
  }
};

const buildTransaction = async (
  connection: Pick<
    Parameters<typeof createSessionConnection>[0],
    "paymaster" | "network" | "sponsor"
  > & {
    rpc: Rpc<GetLatestBlockhashApi>;
    connection: Web3Connection;
    addressLookupTableCache: Map<string, AddressLookupTableAccount>;
    sponsorCache: Map<string, PublicKey>;
  },
  domain: string,
  signerKeys: CryptoKeyPair[],
  instructions: (TransactionInstruction | Instruction)[],
  extraConfig?: {
    addressLookupTable?: string | undefined;
    extraSigners?: (CryptoKeyPair | Keypair)[] | undefined;
  },
) => {
  const [{ value: latestBlockhash }, sponsor, addressLookupTable, signers] =
    await Promise.all([
      connection.rpc.getLatestBlockhash().send(),
      connection.sponsor === undefined
        ? getSponsor(connection, connection.sponsorCache, domain)
        : Promise.resolve(connection.sponsor),
      extraConfig?.addressLookupTable === undefined
        ? Promise.resolve(undefined)
        : getAddressLookupTable(
            connection.connection,
            connection.addressLookupTableCache,
            extraConfig.addressLookupTable,
          ),
      Promise.all(signerKeys.map((signer) => createSignerFromKeyPair(signer))),
    ]);

  return partiallySignTransactionMessageWithSigners(
    pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(fromLegacyPublicKey(sponsor), tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
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
};

const addSignaturesToExistingTransaction = (
  transaction: VersionedTransaction | (Transaction & TransactionWithLifetime),
  signerKeys: CryptoKeyPair[],
) =>
  partiallySignTransaction(
    signerKeys,
    transaction instanceof VersionedTransaction
      ? (fromVersionedTransaction(transaction) as ReturnType<
          typeof fromVersionedTransaction
        > &
          TransactionWithLifetime) // VersionedTransaction has a lifetime so it's fine to cast it so we can call partiallySignTransaction
      : transaction,
  );

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
  options: Pick<
    Parameters<typeof createSessionConnection>[0],
    "paymaster" | "network"
  >,
  sponsorCache: Map<string, PublicKey>,
  domain: string,
) => {
  const value = sponsorCache.get(domain);
  if (value === undefined) {
    const url = new URL(
      "/api/sponsor_pubkey",
      options.paymaster ?? DEFAULT_PAYMASTER[options.network],
    );
    url.searchParams.set("domain", domain);
    const response = await fetch(url);

    if (response.status === 200) {
      const sponsor = new PublicKey(z.string().parse(await response.text()));
      sponsorCache.set(domain, sponsor);
      return sponsor;
    } else {
      throw new PaymasterResponseError(response.status, await response.text());
    }
  } else {
    return value;
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
