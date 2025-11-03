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

const DEFAULT_ADDRESS_LOOKUP_TABLE_ADDRESSES = {
  [Network.Testnet]: [
    // Session intent
    "B8cUjJMqaWWTNNSTXBmeptjWswwCH1gTSCRYv4nu7kJW",
    // Wormhole bridge out
    "5TvNyLwACBbrwDeEYSFxZe4DX57zj1sbdc1cpDU3eKJu",
  ],
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

  return {
    rpc,
    connection,
    network: options.network,
    sendToPaymaster: async (
      domain: string,
      sponsor: PublicKey,
      addressLookupTables: AddressLookupTableAccount[] | undefined,
      sessionKey: CryptoKeyPair | undefined,
      instructions:
        | (TransactionInstruction | Instruction)[]
        | VersionedTransaction
        | (Transaction & TransactionWithLifetime),
      extraSigners?: (CryptoKeyPair | Keypair)[] | undefined
    ) => {
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
      const transaction = await buildTransaction(
        latestBlockhash,
        sessionKey,
        sponsor,
        instructions,
        addressLookupTables,
        extraSigners
      );
      return sendToPaymaster(options, domain, transaction);
    },
    getSponsor: (domain: string) => getSponsor(options, domain),
    getAddressLookupTables: (addressLookupTableAddresses?: string[] | undefined) =>
      getAddressLookupTables(options, connection, addressLookupTableAddresses),
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
      const jsonResponse = await response.json();
      console.log('Paymaster response:', jsonResponse);
      const result = sponsorAndSendResponseSchema.parse(jsonResponse);
      if (result.type === TransactionResultType.Failed) {
        console.error('Transaction failed on-chain:', {
          signature: result.signature,
          error: result.error,
        });
      }
      return result;
    } else {
      const errorText = await response.text();
      console.error('Paymaster HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new PaymasterResponseError(response.status, errorText);
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
  extraSigners?: (CryptoKeyPair | Keypair)[] | undefined
) => {
  const extraSignerKeys = extraSigners === undefined
    ? []
    : await Promise.all(
      extraSigners.map(signer =>
        signer instanceof Keypair ? fromLegacyKeypair(signer) : signer
      )
    );
  const signerKeys = [
    ...extraSignerKeys,
    ...(sessionKey === undefined ? [] : [sessionKey])
  ];
  if (Array.isArray(instructions)) {
    const signers = await Promise.all(
      signerKeys.map(signer => createSignerFromKeyPair(signer))
    );

    // UGLY CODE TO PRINT OUT MISSING ACCOUNTS FROM LUT
    const allAddresses = new Set<string>();
    instructions.forEach((instruction) => {
      const keys = instruction instanceof TransactionInstruction
        ? instruction.keys
        : instruction.accounts ?? [];
      keys.forEach((account: any) => {
        const pubkey = account.pubkey ?? account.address;
        allAddresses.add(pubkey.toString());
      });
    });
    allAddresses.add(sponsor.toString());

    const lookupTableAddresses = new Set<string>();
    addressLookupTables?.forEach((table) => {
      table.state.addresses.forEach((address) => {
        lookupTableAddresses.add(address.toString());
      });
    });

    const accountsNotInLookupTable = Array.from(allAddresses).filter(
      (address) => !lookupTableAddresses.has(address)
    );

    if (accountsNotInLookupTable.length > 0) {
      console.log('Accounts NOT in lookup table:');
      accountsNotInLookupTable.forEach((address) => {
        console.log(`  ${address}`);
      });
      console.log(`Total: ${accountsNotInLookupTable.length} accounts not in lookup table`);
    }

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
  addressLookupTableAddresses?: string[] | undefined,
) => {
  const altAddresses =
    addressLookupTableAddresses ??
    (options.network === undefined
      ? undefined
      : DEFAULT_ADDRESS_LOOKUP_TABLE_ADDRESSES[options.network]);
  if (altAddresses) {
    const addressLookupTableResult = await Promise.all(
      altAddresses.map(address => (
        connection.getAddressLookupTable(new PublicKey(address))
      ))
    );
    return addressLookupTableResult
      .map(item => item.value)
      .filter(item => item !== null);
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
