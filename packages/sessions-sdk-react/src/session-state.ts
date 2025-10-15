import type { Session } from "@fogo/sessions-sdk";
import type { MessageSignerWalletAdapterProps } from "@solana/wallet-adapter-base";
import type { useConnection } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";

export enum StateType {
  Initializing,
  CheckingStoredSession,
  NotEstablished,
  SelectingWallet,
  WalletConnecting,
  RequestingLimits,
  SettingLimits,
  Established,
  UpdatingSession,
  RequestingExtendedExpiry,
  RequestingIncreasedLimits,
}

export type EstablishedOptions = Omit<Session, "sessionInfo"> & {
  expiration: Date;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  createLogInToken: () => Promise<string>;
  connection: ReturnType<typeof useConnection>["connection"];
  isLimited: boolean;
  endSession: () => void;
  updateSession: (
    prevState: StateType,
    duration: number,
    limits?: Map<PublicKey, bigint>,
  ) => void;
};

export const SessionState = {
  Initializing: () => ({ type: StateType.Initializing as const }),

  CheckingStoredSession: () => ({
    type: StateType.CheckingStoredSession as const,
  }),

  NotEstablished: (
    establishSession: (requestedLimits?: Map<PublicKey, bigint>) => void,
  ) => ({
    type: StateType.NotEstablished as const,
    establishSession,
  }),

  SelectingWallet: (args: {
    selectWallet: (wallet: MessageSignerWalletAdapterProps) => void;
    cancel: () => void;
  }) => ({ type: StateType.SelectingWallet as const, ...args }),

  WalletConnecting: (args: { cancel: () => void }) => ({
    type: StateType.WalletConnecting as const,
    ...args,
  }),

  RequestingLimits: (args: {
    requestedLimits?: Map<PublicKey, bigint> | undefined;
    submitLimits: (duration: number, limits?: Map<PublicKey, bigint>) => void;
    cancel: () => void;
  }) => ({
    type: StateType.RequestingLimits as const,
    ...args,
  }),

  SettingLimits: (args: { cancel: () => void }) => ({
    type: StateType.SettingLimits as const,
    ...args,
  }),

  Established: (args: EstablishedOptions) => ({
    type: StateType.Established as const,
    ...args,
  }),

  UpdatingSession: (
    args: Omit<EstablishedOptions, "updateSession"> & {
      previousState: StateType;
    },
  ) => ({
    type: StateType.UpdatingSession as const,
    ...args,
  }),

  RequestingExtendedExpiry: (
    args: EstablishedOptions & {
      cancel: () => void;
    },
  ) => ({
    type: StateType.RequestingExtendedExpiry as const,
    ...args,
  }),

  RequestingIncreasedLimits: (
    args: EstablishedOptions & {
      cancel: () => void;
    },
  ) => ({
    type: StateType.RequestingIncreasedLimits as const,
    ...args,
  }),
};
export type SessionStates = {
  [key in keyof typeof SessionState]: ReturnType<(typeof SessionState)[key]>;
};
export type SessionState = SessionStates[keyof SessionStates];
export type EstablishedSessionState =
  | SessionStates["Established"]
  | SessionStates["UpdatingSession"]
  | SessionStates["RequestingExtendedExpiry"]
  | SessionStates["RequestingIncreasedLimits"];

export const isEstablished = (
  sessionState: SessionState,
): sessionState is EstablishedSessionState =>
  sessionState.type === StateType.Established ||
  sessionState.type === StateType.UpdatingSession ||
  sessionState.type === StateType.RequestingExtendedExpiry ||
  sessionState.type === StateType.RequestingIncreasedLimits;
