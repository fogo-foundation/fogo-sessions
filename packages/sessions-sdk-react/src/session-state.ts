import type { Session } from "@fogo/sessions-sdk";
import type {
  MessageSignerWalletAdapterProps,
  BaseWalletAdapter,
} from "@solana/wallet-adapter-base";
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
  solanaWallet: MessageSignerWalletAdapterProps & BaseWalletAdapter;
  createLogInToken: () => Promise<string>;
  isLimited: boolean;
  endSession: () => void;
  showBridgeIn: () => void;
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
    selectWallet: (
      wallet: MessageSignerWalletAdapterProps & BaseWalletAdapter,
    ) => void;
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

export type EstablishedSessionState = Extract<
  SessionState,
  {
    sessionKey: EstablishedOptions["sessionKey"];
  }
>;

export const isEstablished = (
  sessionState: SessionState,
): sessionState is EstablishedSessionState => "sessionKey" in sessionState;

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
