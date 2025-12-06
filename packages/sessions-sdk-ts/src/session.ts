import { fromLegacyPublicKey } from "@solana/compat";
import { generateKeyPair, getAddressFromPublicKey } from "@solana/kit";
import type { TransactionError } from "@solana/web3.js";
import { Connection, PublicKey } from "@solana/web3.js";
import { deserialize } from "@xlabs-xyz/binary-layout";

import type { TransactionOrInstructions, TransactionResult } from "./connection.js";
import { TransactionResultType } from "./connection.js";
import type { SendTransactionOptions, SessionContext } from "./context.js";
import { domainRecordPda } from "./onchain/domain-registry.js";
import type { SigningFunc } from "./onchain/index.js";
import { chainIdToSessionStartAlt } from "./onchain/index.js";
import {
  composeStartSessionIxs,
  composeRevokeSessionIx,
  sessionAccountLayout,
} from "./onchain/session-manager.js";

export const getDomainRecordAddress = (domain: string) =>
  new PublicKey(domainRecordPda(domain));

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
  const { context, walletPublicKey } = options;
  const sessionKey = options.createUnsafeExtractableSessionKey
    ? await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])
    : await generateKeyPair();

  const sessionAddress = await getAddressFromPublicKey(sessionKey.publicKey);
  const limits = options.unlimited
    ? "Unlimited"
    : Object.fromEntries(
        options.limits?.entries().map(([mint, amount]) =>
          [fromLegacyPublicKey(mint), amount]) ?? []
      );

  const chainId = context.chainId;
  const instructions = await composeStartSessionIxs(
    context.rpc,
    options.signMessage as SigningFunc,
    chainId,
    context.domain,
    options.expires,
    limits,
    options.extra ?? {},
    {
      user:    fromLegacyPublicKey(walletPublicKey),
      sponsor: fromLegacyPublicKey(context.payer),
      session: sessionAddress,
    },
  );

  const result = await context.sendTransaction(
    sessionKey,
    instructions,
    {
      variation: "Session Establishment",
      addressLookupTable:
        options.sessionEstablishmentLookupTable
          ?? chainIdToSessionStartAlt[chainId],
    },
  );

  switch (result.type) {
    case TransactionResultType.Success: {
      const session = await createSession(
        context,
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
  const { context, session } = options;
  if (session.sessionInfo.minor < 2)
    return;

  const instruction = composeRevokeSessionIx(
    {
      session: fromLegacyPublicKey(session.sessionPublicKey),
      sponsor: fromLegacyPublicKey(session.sessionInfo.sponsor),
    },
  );

  return context.sendTransaction(
    session.sessionKey,
    [instruction],
    { variation: "Session Revocation" },
  );
};

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

type SessionInfo = {
  authorizedPrograms: {
    type: AuthorizedProgramsType.All;
  } | {
    type: AuthorizedProgramsType.Specific;
    programs: {
        programId: PublicKey;
        signerPda: PublicKey;
    }[];
  };
  authorizedTokens: AuthorizedTokens;
  expiration: Date;
  extra: Record<string, string>;
  major: number;
  minor: 1 | 2 | 3;
  user: PublicKey;
  sponsor: PublicKey;
};

export const getSessionAccount = async (
  connection: Connection,
  sessionPublicKey: PublicKey,
): Promise<SessionInfo | undefined> => {
  const result = await connection.getAccountInfo(sessionPublicKey, "confirmed");
  if (result === null)
    return;

  const sessionAcc = deserialize(sessionAccountLayout, result.data);
  const { sessionInfo } = sessionAcc;

  const activeSessionInfo =
    sessionInfo.minor === 1
    ? sessionInfo
    : sessionInfo.minor === 2 || sessionInfo.minor === 3
    // eslint-disable-next-line unicorn/no-nested-ternary
    ? sessionInfo.status.active
      ? sessionInfo.status
      : undefined
    : undefined;

  if (activeSessionInfo === undefined)
    return;

  return {
    major: sessionAcc.major,
    minor: sessionInfo.minor as 1 | 2 | 3,
    user: new PublicKey(activeSessionInfo.user),
    expiration: activeSessionInfo.expiration,
    sponsor: new PublicKey(sessionAcc.sponsor),
    authorizedPrograms:
      activeSessionInfo.authorizedPrograms.all
      ? AuthorizedPrograms.All()
      : AuthorizedPrograms.Specific(
          activeSessionInfo.authorizedPrograms.programs.map(
            ({ programId, signerPda }) => ({
              programId: new PublicKey(programId),
              signerPda: new PublicKey(signerPda),
            }),
          ),
        ),
    authorizedTokens:
      activeSessionInfo.authorizedTokens.all
        ? AuthorizedTokens.All
        : AuthorizedTokens.Specific,
    extra: activeSessionInfo.extra,
  };
}

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

export const reestablishSession = createSession;

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
  sessionInfo: SessionInfo;
};
