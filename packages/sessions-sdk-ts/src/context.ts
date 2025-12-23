import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { ChainIdProgram } from "@fogo/sessions-idls";
import { Connection as Web3Connection, Keypair, PublicKey } from "@solana/web3.js";

import type {
  Connection,
  SendTransactionOptions as SendTransactionBaseOptions,
  TransactionOrInstructions,
} from "./connection.js";

// eslint-disable-next-line unicorn/no-typeof-undefined
const IS_BROWSER = typeof globalThis.window !== "undefined";

export const SESSIONS_INTERNAL_PAYMASTER_DOMAIN = "sessions";

export const createSessionContext = async (options: {
  connection: Connection;
  defaultAddressLookupTableAddress?: string | undefined;
  domain?: string | undefined;
}) => {
  const domain = getDomain(options.domain);
  const [sponsor, internalSponsor] = await Promise.all([
    options.connection.getSponsor(domain),
    options.connection.getSponsor(SESSIONS_INTERNAL_PAYMASTER_DOMAIN),
  ]);
  return {
    chainId: await fetchChainId(options.connection.connection),
    domain: getDomain(options.domain),
    payer: sponsor,
    internalPayer: internalSponsor,
    getSolanaConnection: options.connection.getSolanaConnection,
    connection: options.connection.connection,
    rpc: options.connection.rpc,
    network: options.connection.network,
    sendTransaction: (
      sessionKey: CryptoKeyPair | undefined,
      instructions: TransactionOrInstructions,
      walletPublicKey: PublicKey,
      sendTxOptions?: SendTransactionOptions,
    ) =>
      options.connection.sendToPaymaster(
        sendTxOptions?.paymasterDomain ?? domain,
        sessionKey,
        instructions,
        walletPublicKey,
        {
          ...sendTxOptions,
          addressLookupTable:
            sendTxOptions?.addressLookupTable ??
            options.defaultAddressLookupTableAddress,
        },
      ),
  };
};

export type SendTransactionOptions = SendTransactionBaseOptions & {
  paymasterDomain?: string | undefined;
};

export type SessionContext = Awaited<ReturnType<typeof createSessionContext>>;

const fetchChainId = async (connection: Web3Connection) => {
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
