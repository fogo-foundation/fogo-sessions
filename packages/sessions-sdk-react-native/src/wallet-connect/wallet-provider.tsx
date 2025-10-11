import React from 'react';
import type { Connection, PublicKey } from '@solana/web3.js';
import {
  createContext,
  type ReactNode,
  useMemo,
  use,
  useReducer,
  useCallback,
  useRef,
} from 'react';
import { BaseMobileWalletAdapter } from './wallet-connect';
import { MobileWalletFactory } from './wallet-factory';

// Types
interface MobileWalletState {
  status:
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'disconnecting'
    | 'error';
  publicKey: PublicKey | null;
  wallet: BaseMobileWalletAdapter | null;
  error: string | null;
  connectedWalletName: string | null;
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
    case 'CONNECT_START':
      return {
        ...state,
        status: 'connecting',
        wallet: action.wallet,
        connectedWalletName: action.walletName,
        error: null,
      };

    case 'CONNECT_SUCCESS':
      return {
        ...state,
        status: 'connected',
        publicKey: action.publicKey,
        error: null,
      };

    case 'CONNECT_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.error,
        wallet: null,
        publicKey: null,
        connectedWalletName: null,
      };

    case 'DISCONNECT_START':
      return {
        ...state,
        status: 'disconnecting',
        error: null,
      };

    case 'DISCONNECT_SUCCESS':
      return {
        status: 'disconnected',
        publicKey: null,
        wallet: null,
        error: null,
        connectedWalletName: null,
      };

    case 'RESET_ERROR':
      return {
        ...state,
        error: null,
        status: state.status === 'error' ? 'disconnected' : state.status,
      };

    default:
      return state;
  }
}

// Context interfaces
interface MobileConnectionContextValue {
  connection: Connection;
}

interface MobileWalletContextValue {
  // State
  status: MobileWalletState['status'];
  publicKey: PublicKey | null;
  error: string | null;
  connectedWalletName: string | null;

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
    publicKey: null,
    wallet: null,
    error: null,
    connectedWalletName: null,
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

        // Verify public key
        if (!wallet.publicKey) {
          throw new Error('Failed to get public key from wallet');
        }

        // Success - update state
        dispatch({ type: 'CONNECT_SUCCESS', publicKey: wallet.publicKey });

        // Return the public key directly
        return wallet.publicKey;
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
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
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
      return (message: Uint8Array) => state.wallet!.signMessage(message);
    }
    return undefined;
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
      signMessage,

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
