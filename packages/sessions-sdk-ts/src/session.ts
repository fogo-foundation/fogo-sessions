import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider, BorshAccountsCoder } from "@coral-xyz/anchor";
import {
  DomainRegistryIdl,
  SessionManagerIdl,
  SessionManagerProgram,
} from "@fogo/sessions-idls";
import { sha256 } from "@noble/hashes/sha2";
import { fromLegacyPublicKey } from "@solana/compat";
import { generateKeyPair, getAddressFromPublicKey, signatureBytes } from "@solana/kit";
import { getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";
import type { TransactionError } from "@solana/web3.js";
import { Connection, Ed25519Program, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { z } from "zod";

import {
  amountToString,
  addOffchainMessagePrefixToMessageIfNeeded,
  serializeKV,
} from "./common.js";
import type {
  TransactionOrInstructions,
  TransactionResult,
} from "./connection.js";
import { TransactionResultType } from "./connection.js";
import type { SendTransactionOptions, SessionContext } from "./context.js";
import { chainIdToSessionStartAlt } from "./onchain/constants.js";
import { getMplMetadataTruncated, mplMetadataPda } from "./onchain/mpl-metadata.js";

const MESSAGE_HEADER = `Fogo Sessions:
Signing this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.
`;
const UNLIMITED_TOKEN_PERMISSIONS_VALUE =
  "this app may spend any amount of any token";
const TOKENLESS_PERMISSIONS_VALUE = "this app may not spend any tokens";

const CURRENT_MAJOR = "0";
const CURRENT_MINOR = "3";


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
  return Promise.all(
    limits.entries().map(async ([mint, amount]) => {
      const metadataAddress = mplMetadataPda(fromLegacyPublicKey(mint));
      const [mintInfo, metadata] = await Promise.all([
        getMint(context.connection, mint),
        getMplMetadataTruncated(context.rpc, { metadata: metadataAddress }),
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

export const getDomainRecordAddress = (domain: string) => {
  const hash = sha256(domain);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("domain-record"), hash],
    new PublicKey(DomainRegistryIdl.address),
  )[0];
};

export type EstablishSessionOptions = {
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
      [intentInstruction, startSessionInstruction],
      options.sessionEstablishmentLookupTable,
    );
  }
};

const sendSessionEstablishTransaction = async (
  options: EstablishSessionOptions,
  sessionKey: CryptoKeyPair,
  instructions: import("@solana/web3.js").TransactionInstruction[],
  sessionEstablishmentLookupTable: string | undefined,
) => {
  const result = await options.context.sendTransaction(
    sessionKey,
    instructions,
    {
      variation: "Session Establishment",
      addressLookupTable:
        sessionEstablishmentLookupTable ??
        chainIdToSessionStartAlt[options.context.chainId],
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
    return options.context.sendTransaction(
      options.session.sessionKey,
      [instruction],
      {
        variation: "Session Revocation",
      },
    );
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
        sendTransaction: (instructions, extraConfig) =>
          context.sendTransaction(sessionKey, instructions, extraConfig),
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
    instructions: TransactionOrInstructions,
    extraConfig?: SendTransactionOptions,
  ) => Promise<TransactionResult>;
  sessionInfo: NonNullable<z.infer<typeof sessionInfoSchema>>;
};

