import type { Connection, PublicKey } from '@solana/web3.js';
import type { ReactNode } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, {
  createContext,
  use,
  useCallback,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { BaseMobileWalletAdapter } from './wallet-connect';
import { MobileWalletFactory } from './wallet-factory';

// Types
type MobileWalletState = {
  status:
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'disconnecting'
    | 'error';
  publicKey: PublicKey | undefined;
  wallet: BaseMobileWalletAdapter | undefined;
  error: string | undefined;
  connectedWalletName: string | undefined;
}

type WalletAction =
  | {
      type: 'CONNECT_START';
      walletName: string;
      wallet: BaseMobileWalletAdapter;
    }
  | { type: 'CONNECT_SUCCESS'; publicKey: PublicKey }
  | { type: 'CONNECT_ERROR'; error: string }
  | { type: 'DISCONNECT_START' }
  | { type: 'DISCONNECT_SUCCESS' }
  | { type: 'RESET_ERROR' };

// Reducer for better state management
function walletReducer(
  state: MobileWalletState,
  action: WalletAction
): MobileWalletState {
  switch (action.type) {
    case 'CONNECT_START': {
      return {
        ...state,
        status: 'connecting',
        wallet: action.wallet,
        connectedWalletName: action.walletName,
        error: undefined,
      };
    }

    case 'CONNECT_SUCCESS': {
      return {
        ...state,
        status: 'connected',
        publicKey: action.publicKey,
        error: undefined,
      };
    }

    case 'CONNECT_ERROR': {
      return {
        ...state,
        status: 'error',
        error: action.error,
        wallet: undefined,
        publicKey: undefined,
        connectedWalletName: undefined,
      };
    }

    case 'DISCONNECT_START': {
      return {
        ...state,
        status: 'disconnecting',
        error: undefined,
      };
    }

    case 'DISCONNECT_SUCCESS': {
      return {
        status: 'disconnected',
        publicKey: undefined,
        wallet: undefined,
        error: undefined,
        connectedWalletName: undefined,
      };
    }

    case 'RESET_ERROR': {
      return {
        ...state,
        error: undefined,
        status: state.status === 'error' ? 'disconnected' : state.status,
      };
    }

    default: {
      return state;
    }
  }
}

// Context interfaces
type MobileConnectionContextValue = {
  connection: Connection;
}

type MobileWalletContextValue = {
  // State
  status: MobileWalletState['status'];
  publicKey: PublicKey | undefined;
  error: string | undefined;
  connectedWalletName: string | undefined;

  // Computed values
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;

  // Actions
  connect: (walletName?: string) => Promise<PublicKey>;
  disconnect: () => Promise<void>;
  clearError: () => void;

  // Wallet methods (only available when connected)
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;

  // Available wallets
  availableWallets: string[];
}

// Contexts
const MobileConnectionContext = createContext<
  MobileConnectionContextValue | undefined
>(undefined);
const MobileWalletContext = createContext<MobileWalletContextValue | undefined>(
  undefined
);

// Connection Provider (unchanged but simplified)
export const MobileConnectionProvider = ({
  children,
  connection,
}: {
  children: ReactNode;
  connection: Connection;
}) => {
  const value = useMemo(() => ({ connection }), [connection]);
  return (
    <MobileConnectionContext value={value}>{children}</MobileConnectionContext>
  );
};

export const useMobileConnection = () => {
  const context = use(MobileConnectionContext);
  if (!context) {
    throw new Error(
      'useMobileConnection must be used within MobileConnectionProvider'
    );
  }
  return context;
};

// Improved Wallet Provider
export const MobileWalletProvider = ({
  children,
  redirectUrl,
  domain,
}: {
  children: ReactNode;
  redirectUrl: string;
  domain?: string;
}) => {
  const [state, dispatch] = useReducer(walletReducer, {
    status: 'disconnected',
    publicKey: undefined,
    wallet: undefined,
    error: undefined,
    connectedWalletName: undefined,
  });

  // Use ref to always have access to current state in callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  const connect = useCallback(
    async (walletName = 'phantom'): Promise<PublicKey> => {
      try {
        // Create wallet instance
        const wallet = MobileWalletFactory.createWallet(
          walletName,
          redirectUrl,
          domain
        );

        // Start connection
        dispatch({ type: 'CONNECT_START', walletName, wallet });

        // Perform connection
        await wallet.connect();

        // Get public key (throws if not connected)
        const publicKey = wallet.publicKey;

        // Success - update state
        dispatch({ type: 'CONNECT_SUCCESS', publicKey });

        // Return the public key directly
        return publicKey;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown connection error';
        dispatch({ type: 'CONNECT_ERROR', error: errorMessage });
        throw error;
      }
    },
    [redirectUrl, domain]
  );

  const disconnect = useCallback(async () => {
    const currentWallet = stateRef.current.wallet;

    if (!currentWallet) {
      return;
    }

    dispatch({ type: 'DISCONNECT_START' });

    try {
      await currentWallet.disconnect();
    } catch {
      // Continue with disconnection even if wallet.disconnect() fails
    } finally {
      dispatch({ type: 'DISCONNECT_SUCCESS' });
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'RESET_ERROR' });
  }, []);

  // Memoized sign message function
  const signMessage = useMemo(() => {
    if (state.wallet && state.status === 'connected') {
      return (message: Uint8Array) => state.wallet.signMessage(message);
    }
    return;
  }, [state.wallet, state.status]);

  const value = useMemo(
    (): MobileWalletContextValue => ({
      // State
      status: state.status,
      publicKey: state.publicKey,
      error: state.error,
      connectedWalletName: state.connectedWalletName,

      // Computed values
      connected: state.status === 'connected',
      connecting: state.status === 'connecting',
      disconnecting: state.status === 'disconnecting',

      // Actions
      connect,
      disconnect,
      clearError,

      // Wallet methods
      ...(signMessage && { signMessage }),

      // Available wallets
      availableWallets: MobileWalletFactory.getAvailableWallets(),
    }),
    [state, connect, disconnect, clearError, signMessage]
  );

  return <MobileWalletContext value={value}>{children}</MobileWalletContext>;
};

export const useMobileWallet = () => {
  const context = use(MobileWalletContext);
  if (!context) {
    throw new Error('useMobileWallet must be used within MobileWalletProvider');
  }
  return context;
};
