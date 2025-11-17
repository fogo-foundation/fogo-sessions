import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider, BorshAccountsCoder } from "@coral-xyz/anchor";
import {
  DomainRegistryIdl,
  IntentTransferProgram,
  SessionManagerIdl,
  SessionManagerProgram,
} from "@fogo/sessions-idls";
import {
  findMetadataPda,
  safeFetchMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as metaplexPublicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { sha256 } from "@noble/hashes/sha2";
import { fromLegacyPublicKey } from "@solana/compat";
import type { SignatureBytes } from "@solana/kit";
import {
  generateKeyPair,
  getAddressFromPublicKey,
  getProgramDerivedAddress,
  signatureBytes,
  verifySignature,
} from "@solana/kit";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import type {
  BaseWalletAdapter,
  MessageSignerWalletAdapterProps,
} from "@solana/wallet-adapter-base";
import type { TransactionError, TransactionInstruction } from "@solana/web3.js";
import {
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import type {
  Network as WormholeNetwork,
  Chain,
} from "@wormhole-foundation/sdk";
import { Wormhole, wormhole, routes } from "@wormhole-foundation/sdk";
import solanaSdk from "@wormhole-foundation/sdk/solana";
import { contracts } from "@wormhole-foundation/sdk-base";
import { nttExecutorRoute } from "@wormhole-foundation/sdk-route-ntt";
import { utils } from "@wormhole-foundation/sdk-solana-core";
import { NTT } from "@wormhole-foundation/sdk-solana-ntt";
import BN from "bn.js";
import bs58 from "bs58";
import { z } from "zod";

import type { TransactionResult } from "./connection.js";
import { Network, TransactionResultType } from "./connection.js";
import type { SessionContext } from "./context.js";
import {
  importKey,
  signMessageWithKey,
  verifyMessageWithKey,
} from "./crypto.js";

export { type SessionContext, createSessionContext } from "./context.js";

export {
  type TransactionResult,
  type Connection,
  Network,
  TransactionResultType,
  createSessionConnection,
} from "./connection.js";

const MESSAGE_HEADER = `Fogo Sessions:
Signing this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.
`;
const UNLIMITED_TOKEN_PERMISSIONS_VALUE =
  "this app may spend any amount of any token";
const TOKENLESS_PERMISSIONS_VALUE = "this app may not spend any tokens";

const CURRENT_MAJOR = "0";
const CURRENT_MINOR = "3";
const CURRENT_INTENT_TRANSFER_MAJOR = "0";
const CURRENT_INTENT_TRANSFER_MINOR = "2";
const CURRENT_BRIDGE_OUT_MAJOR = "0";
const CURRENT_BRIDGE_OUT_MINOR = "2";

const SESSION_ESTABLISHMENT_LOOKUP_TABLE_ADDRESS = {
  [Network.Testnet]: "B8cUjJMqaWWTNNSTXBmeptjWswwCH1gTSCRYv4nu7kJW",
  [Network.Mainnet]: undefined,
};

type EstablishSessionOptions = {
  context: SessionContext;
  walletPublicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  expires: Date;
  extra?: Record<string, string> | undefined;
  createUnsafeExtractableSessionKey?: boolean | undefined;
  sessionEstablishmentLookupTable?: string | undefined;
} & (
  | { limits?: Map<PublicKey, bigint>; unlimited?: false }
  | { unlimited: true }
);

export const establishSession = async (
  options: EstablishSessionOptions,
): Promise<EstablishSessionResult> => {
  const sessionKey = options.createUnsafeExtractableSessionKey
    ? await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])
    : await generateKeyPair();

  if (options.unlimited) {
    return sendSessionEstablishTransaction(
      options,
      sessionKey,
      await Promise.all([
        buildIntentInstruction(options, sessionKey),
        buildStartSessionInstruction(options, sessionKey),
      ]),
      options.sessionEstablishmentLookupTable,
    );
  } else {
    const filteredLimits = new Map(
      options.limits?.entries().filter(([, amount]) => amount > 0n),
    );
    const tokenInfo =
      filteredLimits.size > 0
        ? await getTokenInfo(options.context, filteredLimits)
        : [];

    const [intentInstruction, startSessionInstruction] = await Promise.all([
      buildIntentInstruction(options, sessionKey, tokenInfo),
      buildStartSessionInstruction(options, sessionKey, tokenInfo),
    ]);
    return sendSessionEstablishTransaction(
      options,
      sessionKey,
      [
        ...buildCreateAssociatedTokenAccountInstructions(options, tokenInfo),
        intentInstruction,
        startSessionInstruction,
      ],
      options.sessionEstablishmentLookupTable,
    );
  }
};

const sendSessionEstablishTransaction = async (
  options: EstablishSessionOptions,
  sessionKey: CryptoKeyPair,
  instructions: TransactionInstruction[],
  sessionEstablishmentLookupTable: string | undefined,
) => {
  const result = await options.context.sendTransaction(
    sessionKey,
    instructions,
    {
      addressLookupTable:
        sessionEstablishmentLookupTable ??
        SESSION_ESTABLISHMENT_LOOKUP_TABLE_ADDRESS[options.context.network],
    },
  );

  switch (result.type) {
    case TransactionResultType.Success: {
      const session = await createSession(
        options.context,
        options.walletPublicKey,
        sessionKey,
      );
      return session
        ? EstablishSessionResult.Success(result.signature, session)
        : EstablishSessionResult.Failed(
            result.signature,
            new Error("Transaction succeeded, but the session was not created"),
          );
    }
    case TransactionResultType.Failed: {
      return EstablishSessionResult.Failed(result.signature, result.error);
    }
  }
};

export const replaceSession = async (
  options: {
    context: SessionContext;
    session: Session;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    expires: Date;
    extra?: Record<string, string> | undefined;
  } & (
    | { limits?: Map<PublicKey, bigint>; unlimited?: false }
    | { unlimited: true }
  ),
) =>
  establishSession({
    ...options,
    walletPublicKey: options.session.walletPublicKey,
  });

export const revokeSession = async (options: {
  context: SessionContext;
  session: Session;
}) => {
  if (options.session.sessionInfo.minor >= 2) {
    const instruction = await new SessionManagerProgram(
      new AnchorProvider(options.context.connection, {} as Wallet, {}),
    ).methods
      .revokeSession()
      .accounts({
        sponsor: options.session.sessionInfo.sponsor,
        session: options.session.sessionPublicKey,
      })
      .instruction();
    return options.context.sendTransaction(options.session.sessionKey, [
      instruction,
    ]);
  } else {
    return;
  }
};

export const reestablishSession = async (
  context: SessionContext,
  walletPublicKey: PublicKey,
  sessionKey: CryptoKeyPair,
): Promise<Session | undefined> =>
  createSession(context, walletPublicKey, sessionKey);

export const getSessionAccount = async (
  connection: Connection,
  sessionPublicKey: PublicKey,
) => {
  const result = await connection.getAccountInfo(sessionPublicKey, "confirmed");
  return result === null
    ? undefined
    : sessionInfoSchema.parse(
        new BorshAccountsCoder(SessionManagerIdl).decode(
          "Session",
          result.data,
        ),
      );
};

const createSession = async (
  context: SessionContext,
  walletPublicKey: PublicKey,
  sessionKey: CryptoKeyPair,
): Promise<Session | undefined> => {
  const sessionPublicKey = new PublicKey(
    await getAddressFromPublicKey(sessionKey.publicKey),
  );
  const sessionInfo = await getSessionAccount(
    context.connection,
    sessionPublicKey,
  );
  return sessionInfo === undefined
    ? undefined
    : {
        sessionPublicKey,
        walletPublicKey,
        sessionKey,
        payer: context.payer,
        sendTransaction: (instructions) =>
          context.sendTransaction(sessionKey, instructions),
        sessionInfo,
      };
};

const sessionInfoSchema = z
  .object({
    session_info: z.union([
      z.object({
        V1: z.object({
          "0": z.object({
            authorized_programs: z.union([
              z.object({
                Specific: z.object({
                  0: z.array(
                    z.object({
                      program_id: z.instanceof(PublicKey),
                      signer_pda: z.instanceof(PublicKey),
                    }),
                  ),
                }),
              }),
              z.object({
                All: z.object({}),
              }),
            ]),
            authorized_tokens: z.union([
              z.object({ Specific: z.object({}) }),
              z.object({ All: z.object({}) }),
            ]),
            expiration: z.instanceof(BN),
            extra: z.object({
              0: z.unknown(),
            }),
            user: z.instanceof(PublicKey),
          }),
        }),
      }),
      z.object({
        V2: z.object({
          "0": z.union([
            z.object({
              Revoked: z.instanceof(BN),
            }),
            z.object({
              Active: z.object({
                "0": z.object({
                  authorized_programs: z.union([
                    z.object({
                      Specific: z.object({
                        0: z.array(
                          z.object({
                            program_id: z.instanceof(PublicKey),
                            signer_pda: z.instanceof(PublicKey),
                          }),
                        ),
                      }),
                    }),
                    z.object({
                      All: z.object({}),
                    }),
                  ]),
                  authorized_tokens: z.union([
                    z.object({ Specific: z.object({}) }),
                    z.object({ All: z.object({}) }),
                  ]),
                  expiration: z.instanceof(BN),
                  extra: z.object({
                    0: z.unknown(),
                  }),
                  user: z.instanceof(PublicKey),
                }),
              }),
            }),
          ]),
        }),
      }),
      z.object({
        V3: z.object({
          "0": z.union([
            z.object({
              Revoked: z.instanceof(BN),
            }),
            z.object({
              Active: z.object({
                "0": z.object({
                  authorized_programs: z.union([
                    z.object({
                      Specific: z.object({
                        0: z.array(
                          z.object({
                            program_id: z.instanceof(PublicKey),
                            signer_pda: z.instanceof(PublicKey),
                          }),
                        ),
                      }),
                    }),
                    z.object({
                      All: z.object({}),
                    }),
                  ]),
                  authorized_tokens: z.union([
                    z.object({
                      Specific: z.object({
                        "0": z.array(z.instanceof(PublicKey)),
                      }),
                    }),
                    z.object({ All: z.object({}) }),
                  ]),
                  expiration: z.instanceof(BN),
                  extra: z.object({
                    0: z.unknown(),
                  }),
                  user: z.instanceof(PublicKey),
                }),
              }),
            }),
          ]),
        }),
      }),
    ]),
    major: z.number(),
    sponsor: z.instanceof(PublicKey),
  })
  .transform(({ session_info, major, sponsor }) => {
    let activeSessionInfo;
    let minor: 1 | 2 | 3;

    if ("V1" in session_info) {
      activeSessionInfo = session_info.V1["0"];
      minor = 1;
    } else if ("V2" in session_info && "Active" in session_info.V2["0"]) {
      activeSessionInfo = session_info.V2["0"].Active["0"];
      minor = 2;
    } else if ("V3" in session_info && "Active" in session_info.V3["0"]) {
      activeSessionInfo = session_info.V3["0"].Active["0"];
      minor = 3;
    } else {
      return;
    }

    return {
      authorizedPrograms:
        "All" in activeSessionInfo.authorized_programs
          ? AuthorizedPrograms.All()
          : AuthorizedPrograms.Specific(
              activeSessionInfo.authorized_programs.Specific[0].map(
                ({ program_id, signer_pda }) => ({
                  programId: program_id,
                  signerPda: signer_pda,
                }),
              ),
            ),
      authorizedTokens:
        "All" in activeSessionInfo.authorized_tokens
          ? AuthorizedTokens.All
          : AuthorizedTokens.Specific,
      expiration: new Date(Number(activeSessionInfo.expiration) * 1000),
      extra: activeSessionInfo.extra[0],
      major: major,
      minor: minor,
      user: activeSessionInfo.user,
      sponsor,
    };
  });

export enum AuthorizedProgramsType {
  All,
  Specific,
}

const AuthorizedPrograms = {
  All: () => ({ type: AuthorizedProgramsType.All as const }),
  Specific: (programs: { programId: PublicKey; signerPda: PublicKey }[]) => ({
    type: AuthorizedProgramsType.Specific as const,
    programs,
  }),
};

export enum AuthorizedTokens {
  All,
  Specific,
}

enum SymbolOrMintType {
  Symbol,
  Mint,
}

const SymbolOrMint = {
  Symbol: (symbol: string) => ({
    type: SymbolOrMintType.Symbol as const,
    symbol,
  }),
  Mint: (mint: PublicKey) => ({
    type: SymbolOrMintType.Mint as const,
    mint,
  }),
};
type SymbolOrMint = ReturnType<
  (typeof SymbolOrMint)[keyof typeof SymbolOrMint]
>;

const getTokenInfo = async (
  context: SessionContext,
  limits: Map<PublicKey, bigint>,
) => {
  const umi = createUmi(context.connection.rpcEndpoint);
  return Promise.all(
    limits.entries().map(async ([mint, amount]) => {
      const metaplexMint = metaplexPublicKey(mint.toBase58());
      const metadataAddress = findMetadataPda(umi, { mint: metaplexMint })[0];
      const [mintInfo, metadata] = await Promise.all([
        getMint(context.connection, mint),
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

const serializeU16LE = (value: number) => {
  const result = new ArrayBuffer(2);
  new DataView(result).setUint16(0, value, true); // littleEndian = true
  return new Uint8Array(result);
};

// Some wallets add a prefix to the messag before signing, for example Ledger through Phantom
const addOffchainMessagePrefixToMessageIfNeeded = async (
  walletPublicKey: PublicKey,
  signature: SignatureBytes,
  message: Uint8Array,
) => {
  const publicKey = await crypto.subtle.importKey(
    "raw",
    walletPublicKey.toBytes(),
    { name: "Ed25519" },
    true,
    ["verify"],
  );

  if (await verifySignature(publicKey, signature, message)) {
    return message;
  } else {
    // Source: https://github.com/anza-xyz/solana-sdk/blob/master/offchain-message/src/lib.rs#L162
    const messageWithOffchainMessagePrefix = Uint8Array.from([
      // eslint-disable-next-line unicorn/number-literal-case
      0xff,
      ...new TextEncoder().encode("solana offchain"),
      0,
      1,
      ...serializeU16LE(message.length),
      ...message,
    ]);
    if (
      await verifySignature(
        publicKey,
        signature,
        messageWithOffchainMessagePrefix,
      )
    ) {
      return messageWithOffchainMessagePrefix;
    } else {
      throw new Error(
        "The signature provided by the browser wallet is not valid",
      );
    }
  }
};
const buildIntentInstruction = async (
  options: EstablishSessionOptions,
  sessionKey: CryptoKeyPair,
  tokens?: TokenInfo[],
) => {
  const message = await buildMessage({
    chainId: options.context.chainId,
    domain: options.context.domain,
    sessionKey,
    expires: options.expires,
    tokens,
    extra: options.extra,
  });

  const intentSignature = signatureBytes(await options.signMessage(message));

  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: options.walletPublicKey.toBytes(),
    signature: intentSignature,
    message: await addOffchainMessagePrefixToMessageIfNeeded(
      options.walletPublicKey,
      intentSignature,
      message,
    ),
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
      }),
      body.extra && serializeExtra(body.extra),
    ].join("\n"),
  );

const serializeExtra = (extra: Record<string, string>) => {
  for (const [key, value] of Object.entries(extra)) {
    if (!/^[a-z]+(_[a-z0-9]+)*$/.test(key)) {
      throw new Error(`Extra key must be a snake_case string: ${key}`);
    }
    if (value.includes("\n")) {
      throw new Error(`Extra value must not contain a line break: ${value}`);
    }
  }
  return serializeKV(extra);
};

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
      options.context.payer,
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

const BRIDGING_ADDRESS_LOOKUP_TABLE: Record<
  Network,
  Record<string, string> | undefined
> = {
  [Network.Testnet]: {
    // USDC
    ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND:
      "4FCi6LptexBdZtaePsoCMeb1XpCijxnWu96g5LsSb6WP",
  },
  [Network.Mainnet]: {
    // USDC
    uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG:
      "BRTw3GAXfEbMUd4GY9P1SQJAvje6LAbj3sRPrdypxpvU",
  },
};

const buildStartSessionInstruction = async (
  options: EstablishSessionOptions,
  sessionKey: CryptoKeyPair,
  tokens?: TokenInfo[],
) => {
  const instruction = new SessionManagerProgram(
    new AnchorProvider(options.context.connection, {} as Wallet, {}),
  ).methods
    .startSession()
    .accounts({
      sponsor: options.context.payer,
      session: await getAddressFromPublicKey(sessionKey.publicKey),
      domainRegistry: getDomainRecordAddress(options.context.domain),
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
    instructions: Parameters<SessionContext["sendTransaction"]>[1],
  ) => Promise<TransactionResult>;
  sessionInfo: NonNullable<z.infer<typeof sessionInfoSchema>>;
};

const USDC_MINT = {
  [Network.Mainnet]: "uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG",
  [Network.Testnet]: "ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND",
};
const USDC_DECIMALS = 6;

export const getTransferFee = async (context: SessionContext) => {
  const { fee, ...config } = await getFee(context);
  return {
    ...config,
    fee: fee.intrachainTransfer,
  };
};

export const getBridgeOutFee = async (context: SessionContext) => {
  const { fee, ...config } = await getFee(context);
  return {
    ...config,
    fee: fee.bridgeTransfer,
  };
};

const getFee = async (context: SessionContext) => {
  const program = new IntentTransferProgram(
    new AnchorProvider(context.connection, {} as Wallet, {}),
  );
  const umi = createUmi(context.connection.rpcEndpoint);
  const usdcMintAddress = USDC_MINT[context.network];
  const usdcMint = new PublicKey(usdcMintAddress);
  const [feeConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_config"), usdcMint.toBytes()],
    program.programId,
  );
  const feeConfig = await program.account.feeConfig.fetch(feeConfigPda);

  return {
    metadata: findMetadataPda(umi, {
      mint: metaplexPublicKey(usdcMintAddress),
    })[0],
    mint: usdcMint,
    symbolOrMint: "USDC",
    decimals: USDC_DECIMALS,
    fee: {
      intrachainTransfer: BigInt(feeConfig.intrachainTransferFee.toString()),
      bridgeTransfer: BigInt(feeConfig.bridgeTransferFee.toString()),
    },
  };
};

const TRANSFER_MESSAGE_HEADER = `Fogo Transfer:
Signing this intent will transfer the tokens as described below.
`;

type SendTransferOptions = {
  context: SessionContext;
  walletPublicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  mint: PublicKey;
  amount: bigint;
  recipient: PublicKey;
  feeConfig: Awaited<ReturnType<typeof getTransferFee>>;
};

export const sendTransfer = async (options: SendTransferOptions) => {
  const sourceAta = getAssociatedTokenAddressSync(
    options.mint,
    options.walletPublicKey,
  );
  const destinationAta = getAssociatedTokenAddressSync(
    options.mint,
    options.recipient,
  );
  const program = new IntentTransferProgram(
    new AnchorProvider(options.context.connection, {} as Wallet, {}),
  );
  const umi = createUmi(options.context.connection.rpcEndpoint);
  const metaplexMint = metaplexPublicKey(options.mint.toBase58());
  const metadataAddress = findMetadataPda(umi, { mint: metaplexMint })[0];
  const metadata = await safeFetchMetadata(umi, metadataAddress);
  const symbol = metadata?.symbol ?? undefined;

  return options.context.sendTransaction(undefined, [
    createAssociatedTokenAccountIdempotentInstruction(
      options.context.payer,
      destinationAta,
      options.recipient,
      options.mint,
    ),
    await buildTransferIntentInstruction(
      program,
      options,
      symbol,
      options.feeConfig.symbolOrMint,
      amountToString(options.feeConfig.fee, options.feeConfig.decimals),
    ),
    await program.methods
      .sendTokens()
      .accounts({
        destinationOwner: options.recipient,
        feeMetadata: options.feeConfig.metadata,
        feeMint: options.feeConfig.mint,
        feeSource: getAssociatedTokenAddressSync(
          options.feeConfig.mint,
          options.walletPublicKey,
        ),
        mint: options.mint,
        source: sourceAta,
        sponsor: options.context.payer,
        // eslint-disable-next-line unicorn/no-null
        metadata: symbol === undefined ? null : new PublicKey(metadataAddress),
      })
      .instruction(),
  ]);
};

const buildTransferIntentInstruction = async (
  program: IntentTransferProgram,
  options: SendTransferOptions,
  symbol: string | undefined,
  feeToken: string,
  feeAmount: string,
) => {
  const [nonce, { decimals }] = await Promise.all([
    getNonce(program, options.walletPublicKey, NonceType.Transfer),
    getMint(options.context.connection, options.mint),
  ]);
  const message = new TextEncoder().encode(
    [
      TRANSFER_MESSAGE_HEADER,
      serializeKV({
        version: `${CURRENT_INTENT_TRANSFER_MAJOR}.${CURRENT_INTENT_TRANSFER_MINOR}`,
        chain_id: options.context.chainId,
        token: symbol ?? options.mint.toBase58(),
        amount: amountToString(options.amount, decimals),
        recipient: options.recipient.toBase58(),
        fee_token: feeToken,
        fee_amount: feeAmount,
        nonce: nonce === null ? "1" : nonce.nonce.add(new BN(1)).toString(),
      }),
    ].join("\n"),
  );

  const intentSignature = signatureBytes(await options.signMessage(message));

  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: options.walletPublicKey.toBytes(),
    signature: intentSignature,
    message: await addOffchainMessagePrefixToMessageIfNeeded(
      options.walletPublicKey,
      intentSignature,
      message,
    ),
  });
};

const BRIDGE_OUT_MESSAGE_HEADER = `Fogo Bridge Transfer:
Signing this intent will bridge out the tokens as described below.
`;

type SendBridgeOutOptions = {
  context: SessionContext;
  sessionKey: CryptoKeyPair;
  sessionPublicKey: PublicKey;
  walletPublicKey: PublicKey;
  solanaWallet: MessageSignerWalletAdapterProps;
  amount: bigint;
  fromToken: WormholeToken & { chain: "Fogo" };
  toToken: WormholeToken & { chain: "Solana" };
  feeConfig: Awaited<ReturnType<typeof getBridgeOutFee>>;
};

type WormholeToken = {
  chain: Chain;
  mint: PublicKey;
  manager: PublicKey;
  transceiver: PublicKey;
};

export const bridgeOut = async (options: SendBridgeOutOptions) => {
  const { wh, route, transferRequest, transferParams, decimals } =
    await buildWormholeTransfer(options, options.context.connection);
  // @ts-expect-error the wormhole client types are incorrect and do not
  // properly represent the runtime representation.
  const quote = await route.fetchExecutorQuote(transferRequest, transferParams);
  const program = new IntentTransferProgram(
    new AnchorProvider(options.context.connection, {} as Wallet, {}),
  );

  const umi = createUmi(options.context.connection.rpcEndpoint);
  const metaplexMint = metaplexPublicKey(options.fromToken.mint.toBase58());
  const metadataAddress = findMetadataPda(umi, { mint: metaplexMint })[0];

  const outboxItem = Keypair.generate();

  const [metadata, nttPdas, destinationAtaExists] = await Promise.all([
    safeFetchMetadata(umi, metadataAddress),
    getNttPdas(
      options,
      wh,
      program,
      outboxItem.publicKey,
      new PublicKey(quote.payeeAddress),
    ),
    getDestinationAtaExists(
      options.context,
      options.toToken.mint,
      options.walletPublicKey,
    ),
  ]);

  return options.context.sendTransaction(
    options.sessionKey,
    await Promise.all([
      buildBridgeOutIntent(
        program,
        options,
        decimals,
        metadata?.symbol,
        options.feeConfig.symbolOrMint,
        amountToString(options.feeConfig.fee, options.feeConfig.decimals),
      ),
      program.methods
        .bridgeNttTokens({
          payDestinationAtaRent: !destinationAtaExists,
          signedQuoteBytes: Buffer.from(quote.signedQuote),
        })
        .accounts({
          sponsor: options.context.payer,
          mint: options.fromToken.mint,
          metadata:
            metadata?.symbol === undefined
              ? // eslint-disable-next-line unicorn/no-null
                null
              : new PublicKey(metadataAddress),
          source: getAssociatedTokenAddressSync(
            options.fromToken.mint,
            options.walletPublicKey,
          ),
          ntt: nttPdas,
          feeMetadata: options.feeConfig.metadata,
          feeMint: options.feeConfig.mint,
          feeSource: getAssociatedTokenAddressSync(
            options.feeConfig.mint,
            options.walletPublicKey,
          ),
        })
        .instruction(),
    ]),
    {
      extraSigners: [outboxItem],
      addressLookupTable:
        BRIDGING_ADDRESS_LOOKUP_TABLE[options.context.network]?.[
          options.fromToken.mint.toBase58()
        ],
    },
  );
};

const getDestinationAtaExists = async (
  context: SessionContext,
  token: PublicKey,
  wallet: PublicKey,
) => {
  const solanaConnection = await context.getSolanaConnection();
  const ataAccount = await solanaConnection.getAccountInfo(
    getAssociatedTokenAddressSync(token, wallet),
  );
  return ataAccount !== null;
};

// Here we use the Wormhole SDKs to produce the wormhole pdas that are needed
// for the bridge out transaction.  Currently this is using wormhole SDK apis
// that are _technically_ public but it seems likely these are not considered to
// be truly public.  It might be better to extract the pdas by using the sdk to
// generate (but not send) a transaction, and taking the pdas from that.  That
// may be something to revisit in the future if we find that the wormhole sdk
// upgrades in ways that break these calls.
const getNttPdas = async <N extends WormholeNetwork>(
  options: SendBridgeOutOptions,
  wh: Wormhole<N>,
  program: IntentTransferProgram,
  outboxItemPublicKey: PublicKey,
  quotePayeeAddress: PublicKey,
) => {
  const pdas = NTT.pdas(options.fromToken.manager);
  const solana = wh.getChain("Solana");
  const coreBridgeContract = contracts.coreBridge.get(wh.network, "Fogo");
  if (coreBridgeContract === undefined) {
    throw new Error("Core bridge contract address not returned by wormhole!");
  }
  const transceiverPdas = NTT.transceiverPdas(options.fromToken.manager);
  const [intentTransferSetterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("intent_transfer")],
    program.programId,
  );
  const wormholePdas = utils.getWormholeDerivedAccounts(
    options.fromToken.manager,
    coreBridgeContract,
  );
  const [registeredTransceiverPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("registered_transceiver"),
      options.fromToken.manager.toBytes(),
    ],
    options.fromToken.manager,
  );

  return {
    emitter: transceiverPdas.emitterAccount(),
    nttConfig: pdas.configAccount(),
    nttCustody: await NTT.custodyAccountAddress(pdas, options.fromToken.mint),
    nttInboxRateLimit: pdas.inboxRateLimitAccount(solana.chain),
    nttManager: options.fromToken.manager,
    nttOutboxItem: outboxItemPublicKey,
    nttOutboxRateLimit: pdas.outboxRateLimitAccount(),
    nttPeer: pdas.peerAccount(solana.chain),
    nttSessionAuthority: pdas.sessionAuthority(
      intentTransferSetterPda,
      NTT.transferArgs(
        options.amount,
        Wormhole.chainAddress("Solana", options.walletPublicKey.toBase58()),
        false,
      ),
    ),
    nttTokenAuthority: pdas.tokenAuthority(),
    payeeNttWithExecutor: quotePayeeAddress,
    transceiver: registeredTransceiverPda,
    wormholeProgram: coreBridgeContract,
    wormholeBridge: wormholePdas.wormholeBridge,
    wormholeFeeCollector: wormholePdas.wormholeFeeCollector,
    wormholeMessage:
      transceiverPdas.wormholeMessageAccount(outboxItemPublicKey),
    wormholeSequence: wormholePdas.wormholeSequence,
  };
};

const buildBridgeOutIntent = async (
  program: IntentTransferProgram,
  options: SendBridgeOutOptions,
  decimals: number,
  symbol: string | undefined,
  feeToken: string,
  feeAmount: string,
) => {
  const nonce = await getNonce(
    program,
    options.walletPublicKey,
    NonceType.Bridge,
  );
  const message = new TextEncoder().encode(
    [
      BRIDGE_OUT_MESSAGE_HEADER,
      serializeKV({
        version: `${CURRENT_BRIDGE_OUT_MAJOR}.${CURRENT_BRIDGE_OUT_MINOR}`,
        from_chain_id: options.context.chainId,
        to_chain_id: "solana",
        token: symbol ?? options.fromToken.mint.toBase58(),
        amount: amountToString(options.amount, decimals),
        recipient_address: options.walletPublicKey.toBase58(),
        fee_token: feeToken,
        fee_amount: feeAmount,
        nonce: nonce === null ? "1" : nonce.nonce.add(new BN(1)).toString(),
      }),
    ].join("\n"),
  );

  const intentSignature = signatureBytes(
    await options.solanaWallet.signMessage(message),
  );

  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: options.walletPublicKey.toBytes(),
    signature: intentSignature,
    message: await addOffchainMessagePrefixToMessageIfNeeded(
      options.walletPublicKey,
      intentSignature,
      message,
    ),
  });
};

type SendBridgeInOptions = {
  context: SessionContext;
  walletPublicKey: PublicKey;
  solanaWallet: BaseWalletAdapter;
  amount: bigint;
  fromToken: WormholeToken & { chain: "Solana" };
  toToken: WormholeToken & { chain: "Fogo" };
};

export const bridgeIn = async (options: SendBridgeInOptions) => {
  const solanaConnection = await options.context.getSolanaConnection();
  const { route, transferRequest, transferParams } =
    await buildWormholeTransfer(options, solanaConnection);
  // @ts-expect-error the wormhole client types are incorrect and do not
  // properly represent the runtime representation.
  const quote = await route.quote(transferRequest, transferParams);
  if (quote.success) {
    return await routes.checkAndCompleteTransfer(
      route,
      await route.initiate(
        transferRequest,
        {
          address: () => options.walletPublicKey.toBase58(),
          chain: () => "Solana",
          signAndSend: (transactions) =>
            Promise.all(
              transactions.map(({ transaction }) =>
                options.solanaWallet.sendTransaction(
                  // Hooray for Wormhole's incomplete typing eh?
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                  transaction.transaction,
                  solanaConnection,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                  { signers: transaction.signers },
                ),
              ),
            ),
        },
        quote,
        Wormhole.chainAddress("Fogo", options.walletPublicKey.toBase58()),
      ),
    );
  } else {
    throw quote.error;
  }
};

const buildWormholeTransfer = async (
  options: {
    context: SessionContext;
    amount: bigint;
    fromToken: WormholeToken;
    toToken: WormholeToken;
    walletPublicKey: PublicKey;
  },
  connection: Connection,
) => {
  const solanaConnection = await options.context.getSolanaConnection();
  const [wh, { decimals }] = await Promise.all([
    wormhole(
      NETWORK_TO_WORMHOLE_NETWORK[options.context.network],
      [solanaSdk],
      {
        chains: { Solana: { rpc: solanaConnection.rpcEndpoint } },
      },
    ),
    getMint(connection, options.fromToken.mint),
  ]);

  const Route = nttExecutorRoute({
    ntt: {
      tokens: {
        USDC: [
          {
            chain: options.fromToken.chain,
            manager: options.fromToken.manager.toBase58(),
            token: options.fromToken.mint.toBase58(),
            transceiver: [
              {
                address: options.fromToken.transceiver.toBase58(),
                type: "wormhole",
              },
            ],
          },
          {
            chain: options.toToken.chain,
            manager: options.toToken.manager.toBase58(),
            token: options.toToken.mint.toBase58(),
            transceiver: [
              {
                address: options.toToken.transceiver.toBase58(),
                type: "wormhole",
              },
            ],
          },
        ],
      },
    },
  });
  const route = new Route(wh);

  const transferRequest = await routes.RouteTransferRequest.create(wh, {
    recipient: Wormhole.chainAddress(
      options.toToken.chain,
      options.walletPublicKey.toBase58(),
    ),
    source: Wormhole.tokenId(
      options.fromToken.chain,
      options.fromToken.mint.toBase58(),
    ),
    destination: Wormhole.tokenId(
      options.toToken.chain,
      options.toToken.mint.toBase58(),
    ),
  });

  const validated = await route.validate(transferRequest, {
    amount: amountToString(options.amount, decimals),
    options: route.getDefaultOptions(),
  });
  if (validated.valid) {
    return {
      wh,
      route,
      transferRequest,
      transferParams: validated.params,
      decimals,
    };
  } else {
    throw validated.error;
  }
};

const NETWORK_TO_WORMHOLE_NETWORK: Record<Network, WormholeNetwork> = {
  [Network.Mainnet]: "Mainnet",
  [Network.Testnet]: "Testnet",
};

const getNonce = async (
  program: IntentTransferProgram,
  walletPublicKey: PublicKey,
  nonceType: NonceType,
) => {
  const [noncePda] = await getProgramDerivedAddress({
    programAddress: fromLegacyPublicKey(program.programId),
    seeds: [
      Buffer.from(NONCE_TYPE_TO_SEED[nonceType]),
      walletPublicKey.toBuffer(),
    ],
  });
  return program.account.nonce.fetchNullable(noncePda);
};

enum NonceType {
  Transfer,
  Bridge,
}

const NONCE_TYPE_TO_SEED: Record<NonceType, string> = {
  [NonceType.Transfer]: "nonce",
  [NonceType.Bridge]: "bridge_ntt_nonce",
};

const loginTokenPayloadSchema = z.object({
  iat: z.number(),
  sessionPublicKey: z.string(),
});

/**
 * Create a login token signed with the session key
 * @param session - The session to create a login token for
 * @returns The login token
 */
export const createLogInToken = async (session: Session) => {
  const payload = {
    // ...we can pass any arbitrary data we want to sign here...
    iat: Date.now(),
    sessionPublicKey: session.sessionPublicKey.toBase58(),
  };

  const message = JSON.stringify(payload);

  // Sign the payload with the session private key
  const signature = await signMessageWithKey(session.sessionKey, message);

  // Return base58(message) + base58(signature)
  return `${bs58.encode(new TextEncoder().encode(message))}.${signature}`;
};

/**
 * Verify a login token
 * @param token - The login token to verify against the session public key
 * @param connection - The connection to use to get the session account
 * @returns The session account if the token is valid, otherwise undefined
 */
export const verifyLogInToken = async (
  token: string,
  connection: Connection,
) => {
  const [rawMessage, signature] = token.split(".");
  if (!rawMessage || !signature) return;

  // Decode + parse payload
  const messageStr = new TextDecoder().decode(bs58.decode(rawMessage));
  const payload = loginTokenPayloadSchema.parse(JSON.parse(messageStr));

  // Verify signature with sessionPublicKey
  const sessionCryptoKey = await importKey(payload.sessionPublicKey);
  const isValid = await verifyMessageWithKey(
    sessionCryptoKey,
    messageStr,
    signature,
  );
  if (!isValid) return;

  const sessionAccount = await getSessionAccount(
    connection,
    new PublicKey(payload.sessionPublicKey),
  );
  if (!sessionAccount) return;

  if (sessionAccount.expiration.getTime() < Date.now()) {
    throw new Error("The session associated with this login token has expired");
  }

  return sessionAccount;
};
