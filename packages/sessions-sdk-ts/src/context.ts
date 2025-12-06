import type {
  Connection,
  SendTransactionOptions as SendTransactionBaseOptions,
  TransactionOrInstructions,
} from "./connection.js";
import { getChainId } from "./onchain/chainid.js";

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
    chainId: await getChainId(options.connection.rpc),
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
      sendTxOptions?: SendTransactionOptions,
    ) =>
      options.connection.sendToPaymaster(
        sendTxOptions?.paymasterDomain ?? domain,
        sessionKey,
        instructions,
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

class DomainRequiredError extends Error {
  constructor() {
    super(
      "On platforms where the origin cannot be determined, you must pass a domain to create a session.",
    );
    this.name = "DomainRequiredError";
  }
}
