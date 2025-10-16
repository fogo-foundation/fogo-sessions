import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider, BorshAccountsCoder } from "@coral-xyz/anchor";
import {
  DomainRegistryIdl,
  IntentTransferProgram,
  SessionManagerIdl,
  SessionManagerProgram,
  TollboothIdl,
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
  Connection,
  TransactionError,
  TransactionInstruction,
} from "@solana/web3.js";
import { Ed25519Program, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import bs58 from "bs58";
import { z } from "zod";

import type { SessionAdapter, TransactionResult } from "./adapter.js";
import { TransactionResultType } from "./adapter.js";
import {
  importKey,
  signMessageWithKey,
  verifyMessageWithKey,
} from "./crypto.js";

export {
  createSolanaWalletAdapter,
  TransactionResultType,
  type SessionAdapter,
  type TransactionResult,
} from "./adapter.js";

const MESSAGE_HEADER = `Fogo Sessions:
Signing this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.
`;
const UNLIMITED_TOKEN_PERMISSIONS_VALUE =
  "this app may spend any amount of any token";
const TOKENLESS_PERMISSIONS_VALUE = "this app may not spend any tokens";

const CURRENT_MAJOR = "0";
const CURRENT_MINOR = "4";
const CURRENT_INTENT_TRANSFER_MAJOR = "0";
const CURRENT_INTENT_TRANSFER_MINOR = "1";

type EstablishSessionOptions = {
  adapter: SessionAdapter;
  walletPublicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  expires: Date;
  extra?: Record<string, string> | undefined;
  createUnsafeExtractableSessionKey?: boolean | undefined;
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
      const session = await createSession(
        options.adapter,
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
    adapter: SessionAdapter;
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
  adapter: SessionAdapter;
  session: Session;
}) => {
  if (options.session.sessionInfo.minor >= 2) {
    const instruction = await new SessionManagerProgram(
      new AnchorProvider(options.adapter.connection, {} as Wallet, {}),
    ).methods
      .revokeSession()
      .accounts({
        sponsor: options.session.sessionInfo.sponsor,
        session: options.session.sessionPublicKey,
      })
      .instruction();
    return options.adapter.sendTransaction(options.session.sessionKey, [
      instruction,
    ]);
  } else {
    return;
  }
};

export const reestablishSession = async (
  adapter: SessionAdapter,
  walletPublicKey: PublicKey,
  sessionKey: CryptoKeyPair,
): Promise<Session | undefined> =>
  createSession(adapter, walletPublicKey, sessionKey);

export const getSessionAccount = async (
  connection: Connection,
  sessionPublicKey: PublicKey,
) => {
  const result = await connection.getAccountInfo(sessionPublicKey, "confirmed");
  const decoded = new BorshAccountsCoder(SessionManagerIdl).decode(
    "Session",
    result!.data,
  );

  console.log("decoded", decoded);
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
  adapter: SessionAdapter,
  walletPublicKey: PublicKey,
  sessionKey: CryptoKeyPair,
): Promise<Session | undefined> => {
  const sessionPublicKey = new PublicKey(
    await getAddressFromPublicKey(sessionKey.publicKey),
  );
  const sessionInfo = await getSessionAccount(
    adapter.connection,
    sessionPublicKey,
  );
  return sessionInfo === undefined
    ? undefined
    : {
      sessionPublicKey,
      walletPublicKey,
      sessionKey,
      payer: adapter.payer,
      sendTransaction: (instructions) =>
        adapter.sendTransaction(sessionKey, instructions),
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
              Revoked: z.unknown(),
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
      z.object({
        V4: z.object({
          "0": z.union([
            z.object({
              Revoked: z.instanceof(BN),
            }),
            z.object({
              Active: z.object({
                "0": z.object({
                  domain_hash: z.array(z.number()),
                  active_session_info: z.object({
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
    let minor: 1 | 2 | 3 | 4;

    if ("V4" in session_info) {
      console.log("session_info", session_info.V4["0"]);
    }
    if ("V1" in session_info) {
      activeSessionInfo = session_info.V1["0"];
      minor = 1;
    } else if ("V2" in session_info && "Active" in session_info.V2["0"]) {
      activeSessionInfo = session_info.V2["0"].Active["0"];
      minor = 2;
    } else if ("V3" in session_info && "Active" in session_info.V3["0"]) {
      activeSessionInfo = session_info.V3["0"].Active["0"];
      minor = 3;
    } else if ("V4" in session_info && "Active" in session_info.V4["0"]) {
      activeSessionInfo = session_info.V4["0"].Active["0"].active_session_info;
      minor = 4;
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
    chainId: options.adapter.chainId,
    domain: options.adapter.domain,
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

export const getDomainTollRecipientAddress = (domain: string) => {
  const hash = sha256(domain);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("toll_recipient"), hash],
    new PublicKey(TollboothIdl.address),
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
    instructions: Parameters<SessionAdapter["sendTransaction"]>[1],
  ) => Promise<TransactionResult>;
  sessionInfo: NonNullable<z.infer<typeof sessionInfoSchema>>;
};

const TRANSFER_MESSAGE_HEADER = `Fogo Transfer:
Signing this intent will transfer the tokens as described below.
`;

type SendTransferOptions = {
  adapter: SessionAdapter;
  walletPublicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  mint: PublicKey;
  amount: bigint;
  recipient: PublicKey;
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
    new AnchorProvider(options.adapter.connection, {} as Wallet, {}),
  );
  const umi = createUmi(options.adapter.connection.rpcEndpoint);
  const metaplexMint = metaplexPublicKey(options.mint.toBase58());
  const metadataAddress = findMetadataPda(umi, { mint: metaplexMint })[0];
  const metadata = await safeFetchMetadata(umi, metadataAddress);
  const symbol = metadata?.symbol ?? undefined;

  return options.adapter.sendTransaction(undefined, [
    createAssociatedTokenAccountIdempotentInstruction(
      options.adapter.payer,
      destinationAta,
      options.recipient,
      options.mint,
    ),
    await buildTransferIntentInstruction(program, options, symbol),
    await program.methods
      .sendTokens()
      .accounts({
        destination: destinationAta,
        mint: options.mint,
        source: sourceAta,
        sponsor: options.adapter.payer,
        // eslint-disable-next-line unicorn/no-null
        metadata: symbol === undefined ? null : new PublicKey(metadataAddress),
      })
      .instruction(),
  ]);
};

const buildTransferIntentInstruction = async (
  program: IntentTransferProgram,
  options: SendTransferOptions,
  symbol?: string,
) => {
  const [nonce, { decimals }] = await Promise.all([
    getNonce(program, options.walletPublicKey),
    getMint(options.adapter.connection, options.mint),
  ]);
  const message = new TextEncoder().encode(
    [
      TRANSFER_MESSAGE_HEADER,
      serializeKV({
        version: `${CURRENT_INTENT_TRANSFER_MAJOR}.${CURRENT_INTENT_TRANSFER_MINOR}`,
        chain_id: options.adapter.chainId,
        token: symbol ?? options.mint.toBase58(),
        amount: amountToString(options.amount, decimals),
        recipient: options.recipient.toBase58(),
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

const getNonce = async (
  program: IntentTransferProgram,
  walletPublicKey: PublicKey,
) => {
  const [noncePda] = await getProgramDerivedAddress({
    programAddress: fromLegacyPublicKey(program.programId),
    seeds: [Buffer.from("nonce"), walletPublicKey.toBuffer()],
  });
  return program.account.nonce.fetchNullable(noncePda);
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
