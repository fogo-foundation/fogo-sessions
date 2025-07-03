import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { ChainIdProgram } from "@fogo/sessions-idls";
import type { Session } from "@fogo/sessions-sdk";
import {
  establishSession as establishSessionImpl,
  createSolanaWalletAdapter,
  SessionResultType,
  reestablishSession,
} from "@fogo/sessions-sdk";
import { useMountEffect } from "@react-hookz/web";
import { NATIVE_MINT } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import type { DBSchema } from "idb";
import { openDB, deleteDB } from "idb";
import { useMemo, useCallback, useState } from "react";

import type { Transaction } from "./use-transaction-log";
import { useWalletInfo } from "../../hooks/use-wallet-info";

export const useSession = (
  sponsor: string,
  addressLookupTableAddress: PublicKey | undefined,
  appendTransaction: (tx: Transaction) => void,
) => {
  const [state, setState] = useState<SessionState>(SessionState.Initializing());
  const { connection } = useConnection();
  const getWalletInfo = useWalletInfo();
  const establishSession = useCallback(() => {
    if (state.type === SessionStateType.Establishing) {
      throw new AlreadyInProgressError();
    } else {
      setState(SessionState.Establishing());
      doEstablishSession(
        connection,
        sponsor,
        addressLookupTableAddress,
        getWalletInfo,
      )
        .then((result) => {
          appendTransaction({
            description: "Create Session",
            signature: result.signature,
            success: result.type === SessionResultType.Success,
          });
          if (result.type === SessionResultType.Success) {
            setStoredSession({
              sessionKey: result.session.sessionKey,
              walletPublicKey: result.session.walletPublicKey.toBase58(),
            }).catch((error: unknown) => {
              // eslint-disable-next-line no-console
              console.error("Failed to persist session", error);
            });
            setState(SessionState.Established(result.session));
          } else {
            // eslint-disable-next-line no-console
            console.error(result.error);
            setState(SessionState.NotEstablished());
          }
        })
        .catch((error: unknown) => {
          // eslint-disable-next-line no-console
          console.error(error);
          setState(SessionState.NotEstablished(error));
        });
    }
  }, [
    sponsor,
    connection,
    getWalletInfo,
    appendTransaction,
    addressLookupTableAddress,
    state,
    setState,
  ]);

  const endSession = useCallback(() => {
    clearStoredSession().catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Failed to clear stored session", error);
    });
    setState(SessionState.NotEstablished());
  }, []);

  useMountEffect(() => {
    getStoredSession()
      .then((current) => {
        if (current === undefined) {
          setState(SessionState.NotEstablished());
        } else {
          setState(SessionState.Restoring());
          restoreSession(
            connection,
            sponsor,
            addressLookupTableAddress,
            current,
          )
            .then((session) => {
              setState(SessionState.Established(session));
            })
            .catch((error: unknown) => {
              // eslint-disable-next-line no-console
              console.error(error);
              setState(SessionState.NotEstablished(error));
            });
        }
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error);
        setState(SessionState.NotEstablished(error));
      });
  });

  return useMemo(() => {
    switch (state.type) {
      case SessionStateType.NotEstablished: {
        return { ...state, establishSession };
      }
      case SessionStateType.Established: {
        return { ...state, endSession };
      }
      default: {
        return state;
      }
    }
  }, [state, establishSession, endSession]);
};

const doEstablishSession = async (
  connection: Connection,
  sponsor: string,
  addressLookupTableAddress: PublicKey | undefined,
  getWalletInfo: ReturnType<typeof useWalletInfo>,
) => {
  const walletInfo = await getWalletInfo();
  return establishSessionImpl({
    adapter: await buildAdapter(
      connection,
      sponsor,
      addressLookupTableAddress,
      walletInfo.signMessage,
    ),
    walletPublicKey: walletInfo.publicKey,
    expires: new Date(Date.now() + 3600 * 1000),
    tokens: new Map([[NATIVE_MINT, 1_500_000_000n]]),
  });
};

const restoreSession = async (
  connection: Connection,
  sponsor: string,
  addressLookupTableAddress: PublicKey | undefined,
  storedSession: StoredSession,
) =>
  reestablishSession(
    await buildAdapter(connection, sponsor, addressLookupTableAddress),
    new PublicKey(storedSession.walletPublicKey),
    storedSession.sessionKey,
  );

const fetchChainId = async (connection: Connection) => {
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
    throw new Error("Failed to derive chain ID address");
  }
  const chainId = await chainIdProgram.account.chainId.fetch(chainIdAddress);
  return chainId.chainId;
};

const buildAdapter = async (
  connection: Connection,
  sponsor: string,
  addressLookupTableAddress: PublicKey | undefined,
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>,
) => {
  const addressLookupTable =
    addressLookupTableAddress === undefined
      ? undefined
      : await connection.getAddressLookupTable(addressLookupTableAddress);

  return createSolanaWalletAdapter({
    connection,
    chainId: await fetchChainId(connection),
    paymasterUrl: "/api/sponsor_and_send",
    sponsor: new PublicKey(sponsor),
    addressLookupTables: addressLookupTable?.value
      ? [addressLookupTable.value]
      : undefined,
    signMessage,
  });
};

export enum SessionStateType {
  Initializing,
  Restoring,
  NotEstablished,
  Establishing,
  Established,
}

const SessionState = {
  Initializing: () => ({ type: SessionStateType.Initializing as const }),
  Restoring: () => ({ type: SessionStateType.Restoring as const }),
  NotEstablished: (error?: unknown) => ({
    type: SessionStateType.NotEstablished as const,
    error,
  }),
  Establishing: () => ({ type: SessionStateType.Establishing as const }),
  Established: (session: Session) => ({
    type: SessionStateType.Established as const,
    session,
  }),
};
type SessionState = ReturnType<
  (typeof SessionState)[keyof typeof SessionState]
>;

class AlreadyInProgressError extends Error {
  constructor() {
    super("Can't attempt session initialization while already in progress!");
    this.name = "AlreadyInProgressError";
  }
}

const getStoredSession = async () => {
  const db = await openDB<SessionDBSchema>("sessionsdb", 1, {
    upgrade: (db) => db.createObjectStore("sessions"),
  });
  const tx = db.transaction("sessions", "readonly");
  const store = tx.objectStore("sessions");
  const key = await store.get("current");
  await tx.done;
  return key;
};

const clearStoredSession = () => deleteDB("sessionsdb");

const setStoredSession = async (sessionData: StoredSession) => {
  const db = await openDB<SessionDBSchema>("sessionsdb", 1, {
    upgrade: (db) => db.createObjectStore("sessions"),
  });
  const tx = db.transaction("sessions", "readwrite");
  const store = tx.objectStore("sessions");
  await store.put(sessionData, "current");
  await tx.done;
};

type SessionDBSchema = DBSchema & {
  sessions: {
    key: string;
    value: StoredSession;
  };
};

type StoredSession = {
  sessionKey: CryptoKeyPair;
  walletPublicKey: string;
};
