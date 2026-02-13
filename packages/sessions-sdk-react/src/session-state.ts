import type { Session } from "@fogo/sessions-sdk";
import type { PublicKey } from "@solana/web3.js";

import type { SolanaWallet } from "./solana-wallet.js";

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
  solanaWallet: SolanaWallet;
  createLogInToken: () => Promise<string>;
  isLimited: boolean;
  endSession: () => void;
  showBridgeIn: () => void;
  updateSession: (
    prevState: StateType,
    duration: number,
    limits?: Map<PublicKey, bigint>,
  ) => void;
  requestExtendedExpiry: (onCancel?: () => void) => void;
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
    selectWallet: (wallet: SolanaWallet) => void;
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
    walletPublicKey: PublicKey;
  }) => ({
    type: StateType.RequestingLimits as const,
    ...args,
  }),

  SettingLimits: (args: {
    cancel: () => void;
    walletPublicKey: PublicKey;
  }) => ({
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

export type EstablishedSessionState = Extract<
  SessionState,
  {
    sessionKey: EstablishedOptions["sessionKey"];
  }
>;

export type WalletConnectedSessionState =
  | EstablishedSessionState
  | Extract<
      SessionState,
      {
        walletPublicKey: PublicKey;
      }
    >;

export const isEstablished = (
  sessionState: SessionState,
): sessionState is EstablishedSessionState => "sessionKey" in sessionState;

export const isWalletLoading = (sessionState: SessionState) =>
  [
    StateType.Initializing,
    StateType.CheckingStoredSession,
    StateType.RequestingLimits,
    StateType.SettingLimits,
    StateType.WalletConnecting,
    StateType.SelectingWallet,
  ].includes(sessionState.type);

export type UpdatableSessionState = Extract<
  SessionState,
  {
    updateSession: EstablishedOptions["updateSession"];
  }
>;

export const isUpdatable = (
  sessionState: SessionState,
): sessionState is UpdatableSessionState => "updateSession" in sessionState;

export type CancelableSessionState = Extract<
  SessionState,
  {
    cancel: () => void;
  }
>;

export const isCancelable = (
  sessionState: SessionState,
): sessionState is CancelableSessionState => "cancel" in sessionState;
