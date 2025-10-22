import { PublicKey } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

import {
  getStoredSession,
  setStoredSession,
  clearStoredSession,
  setLastWalletPublicKey,
  getLastWalletPublicKey,
  clearLastWalletPublicKey,
  getLatestStoredSession,
} from '../session-store';
import { createMockPublicKey, createMockSessionKeyPair, mockSecureStore } from './test-utils';

// Mock modules
jest.mock('expo-secure-store');
jest.mock('react-native');

// Setup mocks
const mockSecureStoreTyped = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAlertTyped = Alert as jest.Mocked<typeof Alert>;

describe('session-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset crypto.subtle mock
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        subtle: {
          importKey: jest.fn(),
          exportKey: jest.fn(),
          sign: jest.fn(),
          verify: jest.fn(),
        },
        getRandomValues: jest.fn((arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        }),
      },
    });
  });

  describe('getStoredSession', () => {
    it('should return stored session successfully', async () => {
      const walletPublicKey = createMockPublicKey('test-wallet');
      const mockStoredData = {
        privateKeyData: 'mock-private-key-base58',
        publicKeyData: 'mock-public-key-base58',
        walletPublicKey: walletPublicKey.toBase58(),
        createdAt: '2023-01-01T00:00:00Z',
        walletName: 'Test Wallet',
      };

      mockSecureStoreTyped.getItemAsync.mockResolvedValueOnce(JSON.stringify(mockStoredData));
      
      // Mock crypto operations
      const mockPrivateKey = { type: 'private', algorithm: { name: 'Ed25519' } };
      const mockPublicKey = { type: 'public', algorithm: { name: 'Ed25519' } };
      const mockCrypto = globalThis.crypto as any;
      mockCrypto.subtle.importKey
        .mockResolvedValueOnce(mockPrivateKey as any)
        .mockResolvedValueOnce(mockPublicKey as any);

      const result = await getStoredSession(walletPublicKey);

      expect(mockSecureStoreTyped.getItemAsync).toHaveBeenCalledWith(
        `fogo_session_${walletPublicKey.toBase58()}`,
        {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to access your session',
        }
      );

      expect(result).toBeDefined();
      expect(result?.sessionKey.privateKey).toEqual(mockPrivateKey);
      expect(result?.sessionKey.publicKey).toEqual(mockPublicKey);
      expect(result?.walletPublicKey.toBase58()).toBe(walletPublicKey.toBase58());
      expect(result?.createdAt).toBe('2023-01-01T00:00:00Z');
      expect(result?.walletName).toBe('Test Wallet');
    });

    it('should return undefined when no stored session exists', async () => {
      mockSecureStoreTyped.getItemAsync.mockResolvedValueOnce(null);

      const result = await getStoredSession(createMockPublicKey());

      expect(result).toBeUndefined();
    });

    it('should handle authentication errors gracefully', async () => {
      const error = new Error('User authentication failed');
      mockSecureStoreTyped.getItemAsync.mockRejectedValueOnce(error);

      const result = await getStoredSession(createMockPublicKey());

      expect(result).toBeUndefined();
      expect(mockAlertTyped.alert).toHaveBeenCalledWith(
        'Authentication Failed',
        'Authentication is required to restore your session.'
      );
    });

    it('should handle cancellation errors gracefully', async () => {
      const error = new Error('User cancelled authentication');
      mockSecureStoreTyped.getItemAsync.mockRejectedValueOnce(error);

      const result = await getStoredSession(createMockPublicKey());

      expect(result).toBeUndefined();
      expect(mockAlertTyped.alert).toHaveBeenCalledWith(
        'Authentication Failed',
        'Authentication is required to restore your session.'
      );
    });

    it('should handle other errors without showing alert', async () => {
      const error = new Error('Network error');
      mockSecureStoreTyped.getItemAsync.mockRejectedValueOnce(error);

      const result = await getStoredSession(createMockPublicKey());

      expect(result).toBeUndefined();
      expect(mockAlertTyped.alert).not.toHaveBeenCalled();
    });

    it('should handle JSON parsing errors', async () => {
      mockSecureStoreTyped.getItemAsync.mockResolvedValueOnce('invalid-json');

      const result = await getStoredSession(createMockPublicKey());

      expect(result).toBeUndefined();
    });
  });

  describe('setStoredSession', () => {
    it('should store session successfully', async () => {
      const sessionData = {
        sessionKey: createMockSessionKeyPair(),
        walletPublicKey: createMockPublicKey('test-wallet'),
        createdAt: '2023-01-01T00:00:00Z',
        walletName: 'Test Wallet',
      };

      const mockPrivateKeyExport = new ArrayBuffer(48); // PKCS8 format
      const mockPublicKeyExport = new ArrayBuffer(32);
      
      const mockCrypto = globalThis.crypto as any;
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(mockPrivateKeyExport)
        .mockResolvedValueOnce(mockPublicKeyExport);

      await setStoredSession(sessionData);

      expect(mockCrypto.subtle.exportKey).toHaveBeenCalledWith('pkcs8', sessionData.sessionKey.privateKey);
      expect(mockCrypto.subtle.exportKey).toHaveBeenCalledWith('raw', sessionData.sessionKey.publicKey);
      
      expect(mockSecureStoreTyped.setItemAsync).toHaveBeenCalledWith(
        `fogo_session_${sessionData.walletPublicKey.toBase58()}`,
        expect.stringContaining(sessionData.walletPublicKey.toBase58()),
        {
          requireAuthentication: true,
          authenticationPrompt: 'Please authenticate to secure your session. You can use your device passcode if biometrics are not set up.',
        }
      );
    });

    it('should handle crypto export errors', async () => {
      const sessionData = {
        sessionKey: createMockSessionKeyPair(),
        walletPublicKey: createMockPublicKey('test-wallet'),
      };

      const mockCrypto = globalThis.crypto as any;
      mockCrypto.subtle.exportKey.mockRejectedValueOnce(new Error('Export failed'));

      await expect(setStoredSession(sessionData)).rejects.toThrow('Export failed');
    });

    it('should handle secure store errors', async () => {
      const sessionData = {
        sessionKey: createMockSessionKeyPair(),
        walletPublicKey: createMockPublicKey('test-wallet'),
      };

      const mockCrypto = globalThis.crypto as any;
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(48))
        .mockResolvedValueOnce(new ArrayBuffer(32));
      
      mockSecureStoreTyped.setItemAsync.mockRejectedValueOnce(new Error('Storage failed'));

      await expect(setStoredSession(sessionData)).rejects.toThrow('Storage failed');
    });

    it('should set default createdAt if not provided', async () => {
      const sessionData = {
        sessionKey: createMockSessionKeyPair(),
        walletPublicKey: createMockPublicKey('test-wallet'),
      };

      const mockCrypto = globalThis.crypto as any;
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(48))
        .mockResolvedValueOnce(new ArrayBuffer(32));

      await setStoredSession(sessionData);

      const [, storedData] = mockSecureStoreTyped.setItemAsync.mock.calls[0];
      const parsedData = JSON.parse(storedData);
      
      expect(parsedData.createdAt).toBeDefined();
      expect(new Date(parsedData.createdAt)).toBeInstanceOf(Date);
    });
  });

  describe('clearStoredSession', () => {
    it('should clear stored session successfully', async () => {
      const walletPublicKey = createMockPublicKey('test-wallet');

      await clearStoredSession(walletPublicKey);

      expect(mockSecureStoreTyped.deleteItemAsync).toHaveBeenCalledWith(
        `fogo_session_${walletPublicKey.toBase58()}`
      );
    });

    it('should handle deletion errors', async () => {
      const walletPublicKey = createMockPublicKey('test-wallet');
      const error = new Error('Deletion failed');
      
      mockSecureStoreTyped.deleteItemAsync.mockRejectedValueOnce(error);

      await expect(clearStoredSession(walletPublicKey)).rejects.toThrow('Deletion failed');
    });
  });

  describe('last wallet public key functions', () => {
    describe('setLastWalletPublicKey', () => {
      it('should store last wallet public key', async () => {
        const walletPublicKey = createMockPublicKey('test-wallet');

        await setLastWalletPublicKey(walletPublicKey);

        expect(mockSecureStoreTyped.setItemAsync).toHaveBeenCalledWith(
          'fogo_last_wallet_public_key',
          walletPublicKey.toBase58(),
          { requireAuthentication: false }
        );
      });

      it('should handle storage errors gracefully', async () => {
        const walletPublicKey = createMockPublicKey('test-wallet');
        mockSecureStoreTyped.setItemAsync.mockRejectedValueOnce(new Error('Storage failed'));

        // Should not throw
        await expect(setLastWalletPublicKey(walletPublicKey)).resolves.toBeUndefined();
      });
    });

    describe('getLastWalletPublicKey', () => {
      it('should retrieve last wallet public key', async () => {
        const walletPublicKey = createMockPublicKey('test-wallet');
        mockSecureStoreTyped.getItemAsync.mockResolvedValueOnce(walletPublicKey.toBase58());

        const result = await getLastWalletPublicKey();

        expect(mockSecureStoreTyped.getItemAsync).toHaveBeenCalledWith(
          'fogo_last_wallet_public_key',
          { requireAuthentication: false }
        );
        expect(result?.toBase58()).toBe(walletPublicKey.toBase58());
      });

      it('should return undefined when no key stored', async () => {
        mockSecureStoreTyped.getItemAsync.mockResolvedValueOnce(null);

        const result = await getLastWalletPublicKey();

        expect(result).toBeUndefined();
      });

      it('should handle retrieval errors gracefully', async () => {
        mockSecureStoreTyped.getItemAsync.mockRejectedValueOnce(new Error('Retrieval failed'));

        const result = await getLastWalletPublicKey();

        expect(result).toBeUndefined();
      });
    });

    describe('clearLastWalletPublicKey', () => {
      it('should clear last wallet public key', async () => {
        await clearLastWalletPublicKey();

        expect(mockSecureStoreTyped.deleteItemAsync).toHaveBeenCalledWith(
          'fogo_last_wallet_public_key'
        );
      });

      it('should handle deletion errors gracefully', async () => {
        mockSecureStoreTyped.deleteItemAsync.mockRejectedValueOnce(new Error('Deletion failed'));

        // Should not throw
        await expect(clearLastWalletPublicKey()).resolves.toBeUndefined();
      });
    });
  });

  describe('getLatestStoredSession', () => {
    it('should get session for latest wallet', async () => {
      const walletPublicKey = createMockPublicKey('test-wallet');
      const mockSessionData = {
        sessionKey: createMockSessionKeyPair(),
        walletPublicKey,
        createdAt: '2023-01-01T00:00:00Z',
        walletName: 'Test Wallet',
      };

      // Mock getLastWalletPublicKey
      mockSecureStoreTyped.getItemAsync
        .mockResolvedValueOnce(walletPublicKey.toBase58()) // getLastWalletPublicKey
        .mockResolvedValueOnce(JSON.stringify({
          privateKeyData: 'mock-private-key',
          publicKeyData: 'mock-public-key',
          walletPublicKey: walletPublicKey.toBase58(),
          createdAt: '2023-01-01T00:00:00Z',
          walletName: 'Test Wallet',
        })); // getStoredSession

      const mockCrypto = globalThis.crypto as any;
      mockCrypto.subtle.importKey
        .mockResolvedValueOnce(mockSessionData.sessionKey.privateKey)
        .mockResolvedValueOnce(mockSessionData.sessionKey.publicKey);

      const result = await getLatestStoredSession();

      expect(result).toBeDefined();
      expect(result?.walletPublicKey.toBase58()).toBe(walletPublicKey.toBase58());
    });

    it('should return undefined when no last wallet exists', async () => {
      mockSecureStoreTyped.getItemAsync.mockResolvedValueOnce(null);

      const result = await getLatestStoredSession();

      expect(result).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      mockSecureStoreTyped.getItemAsync.mockRejectedValueOnce(new Error('Error'));

      const result = await getLatestStoredSession();

      expect(result).toBeUndefined();
    });
  });

});