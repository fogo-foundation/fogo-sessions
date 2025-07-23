import { PublicKey } from "@solana/web3.js";
import { install } from "@solana/webcrypto-ed25519-polyfill";
import type { DBSchema, IDBPObjectStore } from "idb";
import { openDB } from "idb";

install();

export const getStoredSession = async (walletPublicKey: PublicKey) => {
  const session = await withStore("readonly", (store) =>
    store.get(walletPublicKey.toBase58()),
  );
  return session
    ? { ...session, walletPublicKey: new PublicKey(session.walletPublicKey) }
    : undefined;
};

export const clearStoredSession = async (walletPublicKey: PublicKey) =>
  withStore("readwrite", (store) => store.delete(walletPublicKey.toBase58()));

export const setStoredSession = async (
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
