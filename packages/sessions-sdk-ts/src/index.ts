import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { DomainRegistryIdl, SessionManagerProgram } from "@fogo/sessions-idls";
import {
  findMetadataPda,
  safeFetchMetadata,
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
import type { TransactionInstruction, TransactionError } from "@solana/web3.js";
import { Ed25519Program, PublicKey } from "@solana/web3.js";

import type { SessionAdapter, TransactionResult } from "./adapter.js";
import { TransactionResultType } from "./adapter.js";

export {
  type SessionAdapter,
  type TransactionResult,
  TransactionResultType,
  createSolanaWalletAdapter,
} from "./adapter.js";

const MESSAGE_HEADER = `Fogo Sessions:
Signing this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.
`;
const UNLIMITED_TOKEN_PERMISSIONS_VALUE =
  "this app may spend any amount of any token";
const TOKENLESS_PERMISSIONS_VALUE = "this app may not spend any tokens";

const CURRENT_MAJOR = "0";
const CURRENT_MINOR = "1";

type EstablishSessionOptions = {
  adapter: SessionAdapter;
  walletPublicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  expires: Date;
  extra?: string | undefined;
} & (
  | { limits?: Map<PublicKey, bigint>; unlimited?: false }
  | { unlimited: true }
);

export const establishSession = async (
  options: EstablishSessionOptions,
): Promise<EstablishSessionResult> => {
  const sessionKey = await generateKeyPair();

  if (options.unlimited) {
    return sendSessionEstablishTransaction(
      options,
      sessionKey,
      await Promise.all([
        buildIntentInstruction(options, sessionKey),
        buildStartSessionInstruction(options, sessionKey),
      ]),
    );
  } else {
    const filteredLimits = new Map(
      options.limits?.entries().filter(([, amount]) => amount > 0n),
    );
    const tokenInfo =
      filteredLimits.size > 0
        ? await getTokenInfo(options.adapter, filteredLimits)
        : [];

    const [intentInstruction, startSessionInstruction] = await Promise.all([
      buildIntentInstruction(options, sessionKey, tokenInfo),
      buildStartSessionInstruction(options, sessionKey, tokenInfo),
    ]);
    return sendSessionEstablishTransaction(options, sessionKey, [
      ...buildCreateAssociatedTokenAccountInstructions(options, tokenInfo),
      intentInstruction,
      startSessionInstruction,
    ]);
  }
};

const sendSessionEstablishTransaction = async (
  options: EstablishSessionOptions,
  sessionKey: CryptoKeyPair,
  instructions: TransactionInstruction[],
) => {
  const result = await options.adapter.sendTransaction(
    sessionKey,
    instructions,
  );

  switch (result.type) {
    case TransactionResultType.Success: {
      return EstablishSessionResult.Success(
        result.signature,
        await createSession(
          options.adapter,
          options.walletPublicKey,
          sessionKey,
        ),
      );
    }
    case TransactionResultType.Failed: {
      return EstablishSessionResult.Failed(result.signature, result.error);
    }
  }
};

export const replaceSession = async (
  options: {
    adapter: SessionAdapter;
    session: Session;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    expires: Date;
    extra?: string | undefined;
  } & (
    | { limits?: Map<PublicKey, bigint>; unlimited?: false }
    | { unlimited: true }
  ),
) =>
  establishSession({
    ...options,
    walletPublicKey: options.session.walletPublicKey,
  });

// TODO we really should check to ensure the session is still valid...
export const reestablishSession = async (
  adapter: SessionAdapter,
  walletPublicKey: PublicKey,
  sessionKey: CryptoKeyPair,
): Promise<Session> => createSession(adapter, walletPublicKey, sessionKey);

const createSession = async (
  adapter: SessionAdapter,
  walletPublicKey: PublicKey,
  sessionKey: CryptoKeyPair,
): Promise<Session> => ({
  sessionPublicKey: new PublicKey(
    await getAddressFromPublicKey(sessionKey.publicKey),
  ),
  walletPublicKey,
  sessionKey,
  payer: adapter.payer,
  sendTransaction: (instructions) =>
    adapter.sendTransaction(sessionKey, instructions),
});

const SymbolOrMintType = {
  Symbol: "Symbol",
  Mint: "Mint",
} as const;

const SymbolOrMint = {
  Symbol: (symbol: string) => ({
    type: SymbolOrMintType.Symbol,
    symbol,
  }),
  Mint: (mint: PublicKey) => ({
    type: SymbolOrMintType.Mint,
    mint,
  }),
};

const getTokenInfo = async (
  adapter: SessionAdapter,
  limits: Map<PublicKey, bigint>,
) => {
  const umi = createUmi(adapter.connection.rpcEndpoint);
  return Promise.all(
    limits.entries().map(async ([mint, amount]) => {
      const metaplexMint = metaplexPublicKey(mint.toBase58());
      const metadataAddress = findMetadataPda(umi, { mint: metaplexMint })[0];
      const [mintInfo, metadata] = await Promise.all([
        getMint(adapter.connection, mint),
        safeFetchMetadata(umi, metadataAddress),
      ]);

      return {
        symbolOrMint: metadata?.symbol
          ? SymbolOrMint.Symbol(metadata.symbol)
          : SymbolOrMint.Mint(mint),
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
  tokens?: TokenInfo[],
) => {
  const message = await buildMessage({
    chainId: options.adapter.chainId,
    domain: options.adapter.domain,
    sessionKey,
    expires: options.expires,
    tokens,
    extra: options.extra,
  });

  const intentSignature = await options.signMessage(message);

  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: options.walletPublicKey.toBytes(),
    signature: intentSignature,
    message: message,
  });
};

const buildMessage = async (
  body: Pick<EstablishSessionOptions, "expires" | "extra"> & {
    chainId: string;
    domain: string;
    sessionKey: CryptoKeyPair;
    tokens?: TokenInfo[] | undefined;
  },
) =>
  new TextEncoder().encode(
    [
      MESSAGE_HEADER,
      serializeKV({
        version: `${CURRENT_MAJOR}.${CURRENT_MINOR}`,
        chain_id: body.chainId,
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

const serializeTokenList = (tokens?: TokenInfo[]) => {
  if (tokens === undefined) {
    return UNLIMITED_TOKEN_PERMISSIONS_VALUE;
  } else if (tokens.length === 0) {
    return TOKENLESS_PERMISSIONS_VALUE;
  } else {
    return tokens
      .values()
      .map(
        ({ symbolOrMint, amount, decimals }) =>
          `\n-${symbolOrMint.type === SymbolOrMintType.Symbol ? symbolOrMint.symbol : symbolOrMint.mint.toBase58()}: ${amountToString(amount, decimals)}`,
      )
      .toArray()
      .join("");
  }
};

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
      getAssociatedTokenAddressSync(mint, options.walletPublicKey),
      options.walletPublicKey,
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
  tokens?: TokenInfo[],
) => {
  const instruction = new SessionManagerProgram(
    new AnchorProvider(options.adapter.connection, {} as Wallet, {}),
  ).methods
    .startSession()
    .accounts({
      sponsor: options.adapter.payer,
      session: await getAddressFromPublicKey(sessionKey.publicKey),
      domainRegistry: getDomainRecordAddress(options.adapter.domain),
    });

  return tokens === undefined
    ? instruction.instruction()
    : instruction
        .remainingAccounts(
          tokens.flatMap(({ symbolOrMint, mint, metadataAddress }) => [
            {
              pubkey: getAssociatedTokenAddressSync(
                mint,
                options.walletPublicKey,
              ),
              isWritable: true,
              isSigner: false,
            },
            {
              pubkey: mint,
              isWritable: false,
              isSigner: false,
            },
            ...(symbolOrMint.type === SymbolOrMintType.Symbol
              ? [
                  {
                    pubkey: metadataAddress,
                    isWritable: false,
                    isSigner: false,
                  },
                ]
              : []),
          ]),
        )
        .instruction();
};

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
  walletPublicKey: PublicKey;
  payer: PublicKey;
  sendTransaction: (
    instructions: TransactionInstruction[],
  ) => Promise<TransactionResult>;
};
