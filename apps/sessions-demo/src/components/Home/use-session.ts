import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { ChainIdProgram } from "@fogo/sessions-idls";
import type { Session } from "@fogo/sessions-sdk";
import {
  establishSession,
  createSolanaWalletAdapter,
  SessionResultType,
  reestablishSession,
} from "@fogo/sessions-sdk";
import { NATIVE_MINT } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import type { DBSchema, IDBPObjectStore } from "idb";
import { openDB } from "idb";
import { useMemo, useCallback, useState, useEffect, useRef } from "react";

import type { Transaction } from "./use-transaction-log";

export const useSession = (
  sponsor: string,
  addressLookupTableAddress: PublicKey | undefined,
  appendTransaction: (tx: Transaction) => void,
) => {
  const isEstablishing = useRef(false);
  const lastError = useRef<unknown>(undefined);
  const wallet = useWallet();
  const [state, setState] = useState<SessionState>(SessionState.Initializing());
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const doEstablishSession = useCallback(
    (publicKey: PublicKey, signMessage: MessageSigner) => {
      lastError.current = undefined;
      isEstablishing.current = true;
      restoreOrEstablishSession(
        connection,
        sponsor,
        addressLookupTableAddress,
        appendTransaction,
        publicKey,
        signMessage,
      )
        .then((session) => {
          if (session === undefined) {
            wallet.disconnect().catch((error: unknown) => {
              // eslint-disable-next-line no-console
              console.error("Failed to disconnect wallet", error);
            });
          } else {
            setState(SessionState.Established(session));
          }
        })
        .catch((error: unknown) => {
          wallet.disconnect().catch((error: unknown) => {
            // eslint-disable-next-line no-console
            console.error("Failed to disconnect wallet", error);
          });
          // eslint-disable-next-line no-console
          console.error("Failed to restore or establish session", error);
          lastError.current = error;
        })
        .finally(() => {
          isEstablishing.current = false;
        });
    },
    [
      setState,
      connection,
      sponsor,
      addressLookupTableAddress,
      appendTransaction,
      wallet,
    ],
  );

  const establishSession = useCallback(() => {
    if (wallet.publicKey === null || wallet.signMessage === undefined) {
      setVisible(true);
    } else {
      doEstablishSession(wallet.publicKey, wallet.signMessage);
    }
  }, [setVisible, wallet.publicKey, wallet.signMessage, doEstablishSession]);

  useEffect(() => {
    if (!wallet.connecting && !isEstablishing.current) {
      if (
        wallet.disconnecting ||
        wallet.publicKey === null ||
        wallet.signMessage === undefined
      ) {
        setState((prev) =>
          prev.type === SessionStateType.NotEstablished
            ? prev
            : SessionState.NotEstablished(lastError.current),
        );
      } else if (
        state.type === SessionStateType.NotEstablished ||
        state.type === SessionStateType.Initializing ||
        (state.type === SessionStateType.Established &&
          !state.session.walletPublicKey.equals(wallet.publicKey))
      ) {
        doEstablishSession(wallet.publicKey, wallet.signMessage);
      }
    }
  }, [
    wallet.publicKey,
    wallet.connecting,
    wallet.signMessage,
    wallet.disconnecting,
    doEstablishSession,
    state,
  ]);

  const endSession = useCallback(() => {
    if (state.type === SessionStateType.Established) {
      clearStoredSession(state.session.walletPublicKey).catch(
        (error: unknown) => {
          // eslint-disable-next-line no-console
          console.error("Failed to clear stored session", error);
        },
      );
      wallet.disconnect().catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error("Failed to disconnect wallet", error);
      });
      setState(SessionState.NotEstablished());
    } else {
      throw new Error("Cannot end session when session is not established");
    }
  }, [wallet, state]);

  return useMemo(() => {
    if (isEstablishing.current) {
      return SessionState.Loading();
    } else {
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
    }
  }, [state, establishSession, endSession]);
};

const restoreOrEstablishSession = async (
  connection: Connection,
  sponsor: string,
  addressLookupTableAddress: PublicKey | undefined,
  appendTransaction: Parameters<typeof useSession>[2],
  walletPublicKey: PublicKey,
  signMessage: MessageSigner,
) => {
  const storedSession = await getStoredSession(walletPublicKey);
  const addressLookupTable =
    addressLookupTableAddress === undefined
      ? undefined
      : await connection.getAddressLookupTable(addressLookupTableAddress);
  const adapter = createSolanaWalletAdapter({
    connection,
    chainId: await fetchChainId(connection),
    paymasterUrl: "/api/sponsor_and_send",
    sponsor: new PublicKey(sponsor),
    addressLookupTables: addressLookupTable?.value
      ? [addressLookupTable.value]
      : undefined,
    signMessage,
  });
  if (storedSession === undefined) {
    const result = await establishSession({
      adapter,
      walletPublicKey,
      expires: new Date(Date.now() + 3600 * 1000),
      tokens: new Map([[NATIVE_MINT, 1_500_000_000n]]),
    });
    appendTransaction({
      description: "Create Session",
      signature: result.signature,
      success: result.type === SessionResultType.Success,
    });
    switch (result.type) {
      case SessionResultType.Success: {
        await setStoredSession({
          sessionKey: result.session.sessionKey,
          walletPublicKey,
        });
        return result.session;
      }
      case SessionResultType.Failed: {
        // eslint-disable-next-line no-console
        console.error("Failed to create session", result.error);
        return;
      }
    }
  } else {
    return reestablishSession(
      adapter,
      storedSession.walletPublicKey,
      storedSession.sessionKey,
    );
  }
};

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

type MessageSigner = (message: Uint8Array) => Promise<Uint8Array>;

export enum SessionStateType {
  Initializing,
  NotEstablished,
  Loading,
  Established,
}

const SessionState = {
  Initializing: () => ({ type: SessionStateType.Initializing as const }),
  NotEstablished: (error?: unknown) => ({
    type: SessionStateType.NotEstablished as const,
    error,
  }),
  Loading: () => ({ type: SessionStateType.Loading as const }),
  Established: (session: Session) => ({
    type: SessionStateType.Established as const,
    session,
  }),
};
type SessionState = ReturnType<
  (typeof SessionState)[keyof typeof SessionState]
>;

const getStoredSession = async (walletPublicKey: PublicKey) => {
  const session = await withStore("readonly", (store) =>
    store.get(walletPublicKey.toBase58()),
  );
  return session
    ? { ...session, walletPublicKey: new PublicKey(session.walletPublicKey) }
    : undefined;
};

const clearStoredSession = async (walletPublicKey: PublicKey) =>
  withStore("readwrite", (store) => store.delete(walletPublicKey.toBase58()));

const setStoredSession = async (
  sessionData: Omit<StoredSession, "walletPublicKey"> & {
    walletPublicKey: PublicKey;
  },
) => {
  const serializedData = {
    ...sessionData,
    walletPublicKey: sessionData.walletPublicKey.toBase58(),
  };
  return withStore("readwrite", (store) =>
    store.put(serializedData, serializedData.walletPublicKey),
  );
};

const withStore = async <Mode extends IDBTransactionMode, Output>(
  mode: Mode,
  cb: (
    store: IDBPObjectStore<SessionDBSchema, ["sessions"], "sessions", Mode>,
  ) => Promise<Output>,
): Promise<Output> => {
  const db = await openDB<SessionDBSchema>("sessionsdb", 1, {
    upgrade: (db) => db.createObjectStore("sessions"),
  });
  const tx = db.transaction("sessions", mode);
  const store = tx.objectStore("sessions");
  const ret = await cb(store);
  await tx.done;
  return ret;
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
