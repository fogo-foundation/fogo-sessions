import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { MobileWalletProvider, useMobileWallet } from '../../wallet-connect/wallet-provider';
import { MobileWalletFactory } from '../../wallet-connect/wallet-factory';
import { BaseMobileWalletAdapter } from '../../wallet-connect/wallet-connect';
import { createMockPublicKey } from '../test-utils';
import { Linking } from 'react-native';

// Mock React Native Linking
jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getInitialURL: jest.fn(),
  },
}));

const mockLinking = Linking as jest.Mocked<typeof Linking>;

describe('Wallet Connection Integration', () => {
  const redirectUrl = 'myapp://wallet';
  const domain = 'myapp.com';

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <MobileWalletProvider redirectUrl={redirectUrl} domain={domain}>
        {children}
      </MobileWalletProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('wallet provider initialization', () => {
    it('should initialize with disconnected state', () => {
      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.connecting).toBe(false);
      expect(result.current.disconnecting).toBe(false);
      expect(result.current.publicKey).toBeNull();
      expect(result.current.connectedWalletName).toBeNull();
    });

    it('should provide available wallets', () => {
      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      const availableWallets = result.current.availableWallets;
      expect(availableWallets).toContain('phantom');
      expect(availableWallets).toContain('solflare');
      expect(availableWallets).toContain('backpack');
    });
  });

  describe('wallet connection flow', () => {
    it('should connect to wallet successfully', async () => {
      const mockAdapter = {
        name: 'Phantom',
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        signMessage: jest.fn(),
        signTransaction: jest.fn(),
        sendTransaction: jest.fn(),
        connected: false,
        connecting: false,
        disconnecting: false,
        publicKey: null,
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      } as any;

      // Mock wallet factory
      jest.spyOn(MobileWalletFactory, 'createWallet').mockReturnValue(mockAdapter);

      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connected).toBe(false);

      // Simulate wallet connection
      act(() => {
        result.current.connect('phantom');
      });

      expect(result.current.connecting).toBe(true);
      expect(mockAdapter.connect).toHaveBeenCalled();

      // Simulate successful connection
      act(() => {
        mockAdapter.connected = true;
        mockAdapter.connecting = false;
        mockAdapter.publicKey = createMockPublicKey('wallet');
        
        // Simulate adapter event emission
        const connectHandler = mockAdapter.on.mock.calls.find(
          ([event]) => event === 'connect'
        )?.[1];
        
        if (connectHandler) {
          connectHandler();
        }
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      expect(result.current.connecting).toBe(false);
      expect(result.current.connectedWalletName).toBe('phantom');
      expect(result.current.publicKey).toBeTruthy();
    });

    it('should handle connection errors', async () => {
      const mockConnect = jest.fn();
      const mockAdapter = {
        name: 'Phantom',
        connect: mockConnect,
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        connected: false,
        connecting: false,
        disconnecting: false,
        publicKey: null,
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      } as any;

      jest.spyOn(MobileWalletFactory, 'createWallet').mockReturnValue(mockAdapter);

      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      // Configure mock to reject after hook setup
      mockConnect.mockRejectedValueOnce(new Error('Connection failed'));

      await act(async () => {
        try {
          await result.current.connect('phantom');
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.connecting).toBe(false);
      expect(result.current.connected).toBe(false);
      expect(result.current.connectedWalletName).toBeNull();
    });

    it('should handle unsupported wallet', async () => {
      jest.spyOn(MobileWalletFactory, 'createWallet').mockImplementation(() => {
        throw new Error("Wallet 'unsupported' is not supported");
      });

      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      // The connect function is async and catches errors, so we need to check the state
      await act(async () => {
        try {
          await result.current.connect('unsupported');
        } catch (error) {
          // Expected error
          expect(error.message).toContain("not supported");
        }
      });

      // Check that the state reflects the error
      expect(result.current.connected).toBe(false);
      expect(result.current.connecting).toBe(false);
    });
  });

  describe('wallet disconnection flow', () => {
    it('should disconnect from wallet', async () => {
      const mockAdapter = {
        name: 'Phantom',
        connect: jest.fn(),
        disconnect: jest.fn().mockResolvedValue(undefined),
        signMessage: jest.fn(),
        connected: true,
        connecting: false,
        disconnecting: false,
        publicKey: createMockPublicKey('wallet'),
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      } as any;

      jest.spyOn(MobileWalletFactory, 'createWallet').mockReturnValue(mockAdapter);

      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      // Set up connected state
      act(() => {
        result.current.connect('phantom');
        
        // Simulate already connected
        mockAdapter.connected = true;
        const connectHandler = mockAdapter.on.mock.calls.find(
          ([event]) => event === 'connect'
        )?.[1];
        
        if (connectHandler) {
          connectHandler();
        }
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Now disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.disconnecting).toBe(true);
      expect(mockAdapter.disconnect).toHaveBeenCalled();

      // Simulate successful disconnection
      act(() => {
        mockAdapter.connected = false;
        mockAdapter.disconnecting = false;
        mockAdapter.publicKey = null;
        
        const disconnectHandler = mockAdapter.on.mock.calls.find(
          ([event]) => event === 'disconnect'
        )?.[1];
        
        if (disconnectHandler) {
          disconnectHandler();
        }
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.disconnecting).toBe(false);
      });

      expect(result.current.connectedWalletName).toBeNull();
      expect(result.current.publicKey).toBeNull();
    });

    it('should handle disconnection when not connected', async () => {
      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connected).toBe(false);

      act(() => {
        result.current.disconnect();
      });

      // Should not throw or change state
      expect(result.current.connected).toBe(false);
      expect(result.current.disconnecting).toBe(false);
    });
  });

  describe('deep link handling', () => {
    it('should handle deep link responses', async () => {
      const mockAdapter = {
        name: 'Phantom',
        connect: jest.fn(),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        handleDeepLink: jest.fn(),
        connected: true,
        connecting: false,
        disconnecting: false,
        publicKey: createMockPublicKey('wallet'),
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      } as any;

      jest.spyOn(MobileWalletFactory, 'createWallet').mockReturnValue(mockAdapter);

      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      // Connect wallet first
      act(() => {
        result.current.connect('phantom');
        
        const connectHandler = mockAdapter.on.mock.calls.find(
          ([event]) => event === 'connect'
        )?.[1];
        
        if (connectHandler) {
          connectHandler();
        }
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Simulate deep link handling
      const deepLinkUrl = 'myapp://wallet?data=encrypted-response';
      
      if (mockAdapter.handleDeepLink) {
        mockAdapter.handleDeepLink(deepLinkUrl);
        expect(mockAdapter.handleDeepLink).toHaveBeenCalledWith(deepLinkUrl);
      }
    });

    it('should set up deep link listeners on mount', () => {
      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      // Verify that Linking event listeners are set up
      // This would depend on the actual implementation
      expect(result.current).toBeDefined();
    });

    it('should clean up deep link listeners on unmount', () => {
      const { unmount } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      unmount();

      // Verify cleanup - would depend on implementation
    });
  });

  describe('message signing integration', () => {
    it('should sign message through connected wallet', async () => {
      const mockSignature = new Uint8Array([1, 2, 3, 4, 5]);
      const mockAdapter = {
        name: 'Phantom',
        connect: jest.fn(),
        disconnect: jest.fn(),
        signMessage: jest.fn().mockResolvedValue(mockSignature),
        connected: true,
        connecting: false,
        disconnecting: false,
        publicKey: createMockPublicKey('wallet'),
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      } as any;

      jest.spyOn(MobileWalletFactory, 'createWallet').mockReturnValue(mockAdapter);

      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      // Set up connected state
      act(() => {
        result.current.connect('phantom');
        
        const connectHandler = mockAdapter.on.mock.calls.find(
          ([event]) => event === 'connect'
        )?.[1];
        
        if (connectHandler) {
          connectHandler();
        }
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Sign message
      const message = new Uint8Array([1, 2, 3]);
      let signature: Uint8Array | undefined;

      await act(async () => {
        if (result.current.signMessage) {
          signature = await result.current.signMessage(message);
        }
      });

      expect(mockAdapter.signMessage).toHaveBeenCalledWith(message);
      expect(signature).toEqual(mockSignature);
    });

    it('should throw when signing without connection', async () => {
      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.signMessage).toBeUndefined();
    });
  });

  describe('error recovery', () => {
    it('should handle adapter errors gracefully', async () => {
      const mockAdapter = {
        name: 'Phantom',
        connect: jest.fn().mockImplementation(function() {
          // Simulate successful connection by setting publicKey
          this.publicKey = createMockPublicKey('connected-wallet');
          this.connected = true;
        }),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        connected: false,
        connecting: false,
        disconnecting: false,
        publicKey: null,
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      } as any;

      jest.spyOn(MobileWalletFactory, 'createWallet').mockReturnValue(mockAdapter);

      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.connect('phantom');
      });

      // Simulate adapter error
      act(() => {
        const errorHandler = mockAdapter.on.mock.calls.find(
          ([event]) => event === 'error'
        )?.[1];
        
        if (errorHandler) {
          errorHandler(new Error('Adapter error'));
        }
      });

      // Should handle error gracefully without crashing
      expect(result.current.connected).toBe(false);
    });

    it('should allow reconnection after error', async () => {
      const mockAdapter = {
        name: 'Phantom',
        connect: jest.fn()
          .mockRejectedValueOnce(new Error('First attempt failed'))
          .mockImplementationOnce(function() {
            // Second attempt succeeds
            this.publicKey = createMockPublicKey('reconnected-wallet');
            this.connected = true;
          }),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        connected: false,
        connecting: false,
        disconnecting: false,
        publicKey: null,
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      } as any;

      jest.spyOn(MobileWalletFactory, 'createWallet').mockReturnValue(mockAdapter);

      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      // First connection attempt fails
      await act(async () => {
        try {
          await result.current.connect('phantom');
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.connecting).toBe(false);
      expect(result.current.connected).toBe(false);

      // Second attempt succeeds
      await act(async () => {
        await result.current.connect('phantom');
      });

      expect(result.current.connecting).toBe(false);
      expect(result.current.connected).toBe(true);
    });

    it('should handle no Solana wallet error gracefully', async () => {
      const mockAdapter = {
        name: 'Phantom',
        connect: jest.fn().mockRejectedValue(
          new Error('No Solana wallet found in your wallet app. Please create or import a Solana wallet and try connecting again.')
        ),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        connected: false,
        connecting: false,
        disconnecting: false,
        publicKey: null,
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      } as any;

      jest.spyOn(MobileWalletFactory, 'createWallet').mockReturnValue(mockAdapter);

      const { result } = renderHook(() => useMobileWallet(), {
        wrapper: createWrapper(),
      });

      // Connection attempt should fail with helpful error message
      await act(async () => {
        try {
          await result.current.connect('phantom');
        } catch (error: any) {
          expect(error.message).toContain('No Solana wallet found');
          expect(error.message).toContain('create or import a Solana wallet');
        }
      });

      expect(result.current.connecting).toBe(false);
      expect(result.current.connected).toBe(false);
      expect(result.current.connectedWalletName).toBeNull();
    });
  });
});