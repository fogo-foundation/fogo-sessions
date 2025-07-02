import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { DomainRegistryIdl, SessionManagerProgram } from "@fogo/sessions-idls";
import {
  fetchMetadata,
  findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as metaplexPublicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { sha256 } from "@noble/hashes/sha2";
import { generateKeyPair, getAddressFromPublicKey } from "@solana/kit";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import type { TransactionError } from "@solana/web3.js";
import {
  Ed25519Program,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

import type { SessionAdapter, TransactionResult } from "./adapter.js";
import { TransactionResultType } from "./adapter.js";

export { TransactionResultType, createSolanaWalletAdapter } from "./adapter.js";

// eslint-disable-next-line no-constant-binary-expression, @typescript-eslint/no-unnecessary-condition, valid-typeof
const IS_BROWSER = typeof globalThis.window !== undefined;

const MESSAGE_HEADER = `Fogo Sessions:
Signing this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.
`;

const CURRENT_MAJOR = "0";
const CURRENT_MINOR = "1";

type EstablishSessionOptions = {
  adapter: SessionAdapter;
  publicKey: PublicKey;
  domain?: string | undefined;
  expires: Date;
  tokens: Map<PublicKey, bigint>;
  extra?: string | undefined;
};

export const establishSession = async (
  options: EstablishSessionOptions,
): Promise<EstablishSessionResult> => {
  const sessionKey = await generateKeyPair();

  const tokenInfo = await getTokenInfo(options);

  const [intentInstruction, startSessionInstruction] = await Promise.all([
    buildIntentInstruction(options, sessionKey, tokenInfo),
    buildStartSessionInstruction(options, sessionKey, tokenInfo),
  ]);
  const result = await options.adapter.sendTransaction(sessionKey, [
    intentInstruction,
    ...buildCreateAssociatedTokenAccountInstructions(options, tokenInfo),
    startSessionInstruction,
  ]);

  switch (result.type) {
    case TransactionResultType.Success: {
      return EstablishSessionResult.Success(
        result.signature,
        await createSession(options.adapter, options.publicKey, sessionKey),
      );
    }
    case TransactionResultType.Failed: {
      return EstablishSessionResult.Failed(result.signature, result.error);
    }
  }
};

// TODO we really should check to ensure the session is still valid...
export const reestablishSession = async (
  adapter: SessionAdapter,
  publicKey: PublicKey,
  sessionKey: CryptoKeyPair,
): Promise<Session> => createSession(adapter, publicKey, sessionKey);

const createSession = async (
  adapter: SessionAdapter,
  publicKey: PublicKey,
  sessionKey: CryptoKeyPair,
): Promise<Session> => ({
  sessionPublicKey: new PublicKey(
    await getAddressFromPublicKey(sessionKey.publicKey),
  ),
  publicKey,
  sessionKey,
  payer: adapter.payer,
  sendTransaction: (instructions) =>
    adapter.sendTransaction(sessionKey, instructions),
});

const getTokenInfo = async (options: EstablishSessionOptions) => {
  const umi = createUmi(options.adapter.connection.rpcEndpoint);
  return Promise.all(
    options.tokens.entries().map(async ([mint, amount]) => {
      const metaplexMint = metaplexPublicKey(mint.toBase58());
      const metadataAddress = findMetadataPda(umi, { mint: metaplexMint })[0];
      const [mintInfo, metadata] = await Promise.all([
        getMint(options.adapter.connection, mint),
        fetchMetadata(umi, metadataAddress),
      ]);

      return {
        symbol: metadata.symbol,
        metadataAddress: new PublicKey(metadataAddress),
        amount,
        mint,
        decimals: mintInfo.decimals,
      };
    }),
  );
};

type TokenInfo = Awaited<ReturnType<typeof getTokenInfo>>[number];

const buildIntentInstruction = async (
  options: EstablishSessionOptions,
  sessionKey: CryptoKeyPair,
  tokens: TokenInfo[],
) => {
  if (options.adapter.signMessage === undefined) {
    throw new Error("Cannot establish a session if no wallet is connected");
  } else {
    const message = await buildMessage({
      domain: getDomain(options.domain),
      sessionKey,
      expires: options.expires,
      tokens,
      extra: options.extra,
    });

    const intentSignature = await options.adapter.signMessage(message);

    return Ed25519Program.createInstructionWithPublicKey({
      publicKey: options.publicKey.toBytes(),
      signature: intentSignature,
      message: message,
    });
  }
};

const getDomain = (requestedDomain?: string) => {
  const detectedDomain = IS_BROWSER ? globalThis.location.origin : undefined;

  if (requestedDomain === undefined) {
    if (detectedDomain === undefined) {
      throw new Error(
        "On platforms where the origin cannot be determined, you must pass a domain to create a session.",
      );
    } else {
      return detectedDomain;
    }
  } else {
    if (detectedDomain === undefined || detectedDomain === requestedDomain) {
      return requestedDomain;
    } else {
      throw new Error("You cannot create a session for a different domain.");
    }
  }
};

const buildMessage = async (
  body: Pick<EstablishSessionOptions, "expires" | "extra"> & {
    domain: string;
    sessionKey: CryptoKeyPair;
    tokens: TokenInfo[];
  },
) =>
  new TextEncoder().encode(
    [
      MESSAGE_HEADER,
      serializeKV({
        version: `${CURRENT_MAJOR}.${CURRENT_MINOR}`,
        chain_id: "localnet",
        domain: body.domain,
        expires: body.expires.toISOString(),
        session_key: await getAddressFromPublicKey(body.sessionKey.publicKey),
        tokens: serializeTokenList(body.tokens),
        ...(body.extra && { extra: body.extra }),
      }),
    ].join("\n"),
  );

const serializeKV = (data: Record<string, string>) =>
  Object.entries(data)
    .map(([key, value]) =>
      [key, ":", value.startsWith("\n") ? "" : " ", value].join(""),
    )
    .join("\n");

const serializeTokenList = (tokens: TokenInfo[]) =>
  tokens
    .values()
    .map(
      ({ symbol, amount, decimals }) =>
        `\n-${symbol}: ${amountToString(amount, decimals)}`,
    )
    .toArray()
    .join("");

const amountToString = (amount: bigint, decimals: number): string => {
  const asStr = amount.toString();
  const whole =
    asStr.length > decimals ? asStr.slice(0, asStr.length - decimals) : "0";
  const decimal =
    asStr.length > decimals ? asStr.slice(asStr.length - decimals) : asStr;
  const decimalPadded = decimal.padStart(decimals, "0");
  const decimalTruncated = decimalPadded.replace(/0+$/, "");

  return [
    whole,
    ...(decimalTruncated === "" ? [] : [".", decimalTruncated]),
  ].join("");
};

const buildCreateAssociatedTokenAccountInstructions = (
  options: EstablishSessionOptions,
  tokens: TokenInfo[],
) =>
  tokens.map(({ mint }) =>
    createAssociatedTokenAccountIdempotentInstruction(
      options.adapter.payer,
      getAssociatedTokenAddressSync(mint, options.publicKey),
      options.publicKey,
      mint,
    ),
  );

export const getDomainRecordAddress = (domain: string) => {
  const hash = sha256(domain);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("domain-record"), hash],
    new PublicKey(DomainRegistryIdl.address),
  )[0];
};

const buildStartSessionInstruction = async (
  options: EstablishSessionOptions,
  sessionKey: CryptoKeyPair,
  tokens: TokenInfo[],
) =>
  new SessionManagerProgram(
    new AnchorProvider(options.adapter.connection, {} as Wallet, {}),
  ).methods
    .startSession()
    .accounts({
      sponsor: options.adapter.payer,
      session: await getAddressFromPublicKey(sessionKey.publicKey),
      domainRegistry: getDomainRecordAddress(getDomain(options.domain)),
    })
    .remainingAccounts(
      tokens.flatMap(({ mint, metadataAddress }) => [
        {
          pubkey: getAssociatedTokenAddressSync(mint, options.publicKey),
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: mint,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: metadataAddress,
          isWritable: false,
          isSigner: false,
        },
      ]),
    )
    .instruction();

export enum SessionResultType {
  Success,
  Failed,
}

const EstablishSessionResult = {
  Success: (signature: string, session: Session) => ({
    type: SessionResultType.Success as const,
    signature,
    session,
  }),
  Failed: (signature: string, error: TransactionError) => ({
    type: SessionResultType.Failed as const,
    signature,
    error,
  }),
};

type EstablishSessionResult = ReturnType<
  (typeof EstablishSessionResult)[keyof typeof EstablishSessionResult]
>;

export type Session = {
  sessionPublicKey: PublicKey;
  sessionKey: CryptoKeyPair;
  publicKey: PublicKey;
  payer: PublicKey;
  sendTransaction: (
    instructions: TransactionInstruction[],
  ) => Promise<TransactionResult>;
};
