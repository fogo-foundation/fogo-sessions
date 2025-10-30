import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { ChainIdProgram } from "@fogo/sessions-idls";
import { Connection as Web3Connection, Keypair } from "@solana/web3.js";

import type { Connection } from "./connection.js";

// eslint-disable-next-line unicorn/no-typeof-undefined
const IS_BROWSER = typeof globalThis.window !== "undefined";

export const createSessionContext = async (options: {
  connection: Connection;
  addressLookupTableAddresses?: string[] | undefined;
  domain?: string | undefined;
}) => {
  const addressLookupTables = await options.connection.getAddressLookupTables(
    options.addressLookupTableAddresses,
  );
  const domain = getDomain(options.domain);
  const sponsor = await options.connection.getSponsor(domain);
  return {
    chainId: await fetchChainId(options.connection.connection),
    domain: getDomain(options.domain),
    payer: sponsor,
    connection: options.connection.connection,
    rpc: options.connection.rpc,
    network: options.connection.network,
    sendTransaction: (
      sessionKey: CryptoKeyPair | undefined,
      instructions: Parameters<typeof options.connection.sendToPaymaster>[4],
      extraSigners?: Parameters<typeof options.connection.sendToPaymaster>[5],
    ) =>
      options.connection.sendToPaymaster(
        domain,
        sponsor,
        addressLookupTables,
        sessionKey,
        instructions,
        extraSigners,
      ),
  };
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
