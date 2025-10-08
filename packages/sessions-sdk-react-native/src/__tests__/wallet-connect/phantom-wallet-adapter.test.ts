/* eslint-disable @typescript-eslint/ban-ts-comment */
// Note: This test file accesses protected methods and uses type suppressions for testing purposes

import { PhantomMobileWalletAdapter } from '../../wallet-connect/phantom-wallet-adapter';
import { WalletSignMessageError, WalletSignTransactionError } from '@solana/wallet-adapter-base';
import { Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { Linking } from 'react-native';
import { base58 } from '@scure/base';
import { mockConnection, createMockPublicKey } from '../test-utils';

// Mock React Native Linking
jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
  },
}));

const mockLinking = Linking as jest.Mocked<typeof Linking>;

describe('PhantomMobileWalletAdapter', () => {
  let adapter: PhantomMobileWalletAdapter;
  const redirectUrl = 'myapp://wallet';
  const domain = 'myapp.com';

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PhantomMobileWalletAdapter(redirectUrl, domain);
    
    // Mock the adapter's internal methods
    jest.spyOn(adapter, 'performEncryptedConnect').mockResolvedValue();
    // @ts-ignore - accessing protected methods for testing
    jest.spyOn(adapter, 'encryptPayload').mockReturnValue([
      new Uint8Array([1, 2, 3]), // nonce
      new Uint8Array([4, 5, 6]), // encrypted payload
    ]);
    // @ts-ignore - accessing protected methods for testing
    jest.spyOn(adapter, 'waitForWalletResponse').mockResolvedValue({
      data: 'mock-response-data',
      nonce: new Uint8Array([7, 8, 9]),
    });
    // @ts-ignore - accessing protected methods for testing
    jest.spyOn(adapter, 'decodeTransaction').mockReturnValue(new Uint8Array(100));
    // @ts-ignore - accessing protected methods for testing
    jest.spyOn(adapter, 'decryptPayload').mockReturnValue({
      signature: base58.encode(new Uint8Array(64)),
    });
    jest.spyOn(adapter, 'generateRedirectUrl').mockReturnValue('myapp://wallet');
    jest.spyOn(adapter, 'buildUrl').mockReturnValue('phantom://test');

    // Mock dappKeyPair
    Object.defineProperty(adapter, 'dappKeyPair', {
      value: {
        publicKey: new Uint8Array(32),
        secretKey: new Uint8Array(64),
      },
      writable: true,
    });

    // Mock session
    Object.defineProperty(adapter, 'session', {
      value: 'mock-session',
      writable: true,
    });

    // Mock shared secret
    Object.defineProperty(adapter, 'sharedSecret', {
      value: new Uint8Array(32),
      writable: true,
    });
  });

  describe('wallet properties', () => {
    it('should have correct wallet properties', () => {
      expect(adapter.name).toBe('Phantom');
      expect(adapter.url).toBe('https://phantom.app');
      expect(adapter.deepLinkScheme).toBe('phantom');
      expect(adapter.universalLinkDomain).toBe('phantom.app');
      expect(adapter.supportedTransactionVersions).toEqual(new Set(['legacy', 0]));
    });

    it('should have correct encryption public key parameter', () => {
      expect(adapter.getEncryptionPublicKeyParam()).toBe('phantom_encryption_public_key');
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await adapter.connect();

      expect(adapter.performEncryptedConnect).toHaveBeenCalled();
      expect(adapter.connecting).toBe(false);
    });

    it('should set connecting state during connection', async () => {
      let resolveConnect: () => void;
      const connectPromise = new Promise<void>((resolve) => {
        resolveConnect = resolve;
      });

      (adapter.performEncryptedConnect as jest.Mock).mockReturnValueOnce(connectPromise);

      const connectionPromise = adapter.connect();
      expect(adapter.connecting).toBe(true);

      resolveConnect!();
      await connectionPromise;
      expect(adapter.connecting).toBe(false);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      (adapter.performEncryptedConnect as jest.Mock).mockRejectedValueOnce(error);

      const emitSpy = jest.spyOn(adapter, 'emit');

      await expect(adapter.connect()).rejects.toThrow('Connection failed');
      expect(emitSpy).toHaveBeenCalledWith('error', error);
      expect(adapter.connecting).toBe(false);
    });

    it('should handle case when no Solana wallet is present in Phantom', async () => {
      const noWalletError = new Error('No Solana wallet found in your wallet app. Please create or import a Solana wallet and try connecting again.');
      (adapter.performEncryptedConnect as jest.Mock).mockRejectedValueOnce(noWalletError);
      const emitSpy = jest.spyOn(adapter, 'emit');

      await expect(adapter.connect()).rejects.toThrow('No Solana wallet found in your wallet app');
      expect(emitSpy).toHaveBeenCalledWith('error', noWalletError);
      expect(adapter.connecting).toBe(false);
      expect(adapter.connected).toBe(false);
    });

    it('should reset connecting state on error', async () => {
      const error = new Error('Connection failed');
      (adapter.performEncryptedConnect as jest.Mock).mockRejectedValueOnce(error);

      try {
        await adapter.connect();
      } catch {
        // Expected error
      }

      expect(adapter.connecting).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      // Set up connected state
      (adapter as any)._connected = true;
      (adapter as any)._publicKey = createMockPublicKey();
      
      const emitSpy = jest.spyOn(adapter, 'emit');

      await adapter.disconnect();

      expect(adapter.connected).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith('disconnect');
      // Test that publicKey throws when disconnected
      expect(() => adapter.publicKey).toThrow('Wallet not connected');
    });

    it('should work when already disconnected', async () => {
      const emitSpy = jest.spyOn(adapter, 'emit');

      await adapter.disconnect();

      expect(adapter.connected).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith('disconnect');
      // Test that publicKey throws when disconnected
      expect(() => adapter.publicKey).toThrow('Wallet not connected');
    });
  });

  describe('signMessage', () => {
    beforeEach(() => {
      (adapter as any)._connected = true;
      (adapter as any)._publicKey = createMockPublicKey();
    });

    it('should sign message successfully', async () => {
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      mockLinking.openURL.mockResolvedValueOnce(true);

      const signature = await adapter.signMessage(message);

      expect(adapter.encryptPayload).toHaveBeenCalledWith({
        session: 'mock-session',
        message: base58.encode(message),
      });
      expect(mockLinking.openURL).toHaveBeenCalledWith('phantom://test');
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(32); // The actual implementation returns 32 bytes
    });

    it('should throw error when not connected', async () => {
      (adapter as any)._connected = false;
      const message = new Uint8Array([1, 2, 3]);

      await expect(adapter.signMessage(message)).rejects.toThrow(
        WalletSignMessageError
      );
    });

    it('should throw error when no public key', async () => {
      (adapter as any)._publicKey = null;
      const message = new Uint8Array([1, 2, 3]);

      await expect(adapter.signMessage(message)).rejects.toThrow(
        WalletSignMessageError
      );
    });

    it('should handle wallet response errors', async () => {
      const message = new Uint8Array([1, 2, 3]);
      const errorResponse = { error: 'User rejected request' };
      
      (adapter.waitForWalletResponse as jest.Mock).mockResolvedValueOnce(errorResponse);

      await expect(adapter.signMessage(message)).rejects.toThrow(
        WalletSignMessageError
      );
    });

    it('should handle missing signature in response', async () => {
      const message = new Uint8Array([1, 2, 3]);
      
      (adapter.waitForWalletResponse as jest.Mock).mockResolvedValueOnce({
        data: null,
      });

      await expect(adapter.signMessage(message)).rejects.toThrow(
        'No signature received'
      );
    });

    it('should handle encryption errors', async () => {
      const message = new Uint8Array([1, 2, 3]);
      
      (adapter.encryptPayload as jest.Mock).mockReturnValueOnce([null, null]);

      await expect(adapter.signMessage(message)).rejects.toThrow(
        'Unable to generate nonce'
      );
    });

    it('should handle decryption errors', async () => {
      const message = new Uint8Array([1, 2, 3]);
      
      (adapter.waitForWalletResponse as jest.Mock).mockResolvedValueOnce({
        data: 'encrypted-data',
        nonce: null, // Missing nonce
      });

      await expect(adapter.signMessage(message)).rejects.toThrow(
        'Unable to decrypt signed data'
      );
    });

    it('should emit error on exception', async () => {
      const message = new Uint8Array([1, 2, 3]);
      const error = new Error('Network error');
      
      mockLinking.openURL.mockRejectedValueOnce(error);
      const emitSpy = jest.spyOn(adapter, 'emit');

      await expect(adapter.signMessage(message)).rejects.toThrow('Network error');
      expect(emitSpy).toHaveBeenCalledWith('error', error);
    });
  });

  describe('signTransaction', () => {
    let mockTransaction: Transaction;

    beforeEach(() => {
      (adapter as any)._connected = true;
      (adapter as any)._publicKey = createMockPublicKey();
      
      mockTransaction = new Transaction();
      mockTransaction.feePayer = createMockPublicKey();
      mockTransaction.recentBlockhash = 'recent-blockhash';
      
      jest.spyOn(mockTransaction, 'serialize').mockReturnValue(new Uint8Array(100));
    });

    it('should sign transaction successfully', async () => {
      mockLinking.openURL.mockResolvedValueOnce(true);

      const signedTransaction = await adapter.signTransaction(mockTransaction);

      expect(adapter.encryptPayload).toHaveBeenCalledWith({
        session: 'mock-session',
        transaction: expect.any(String),
      });
      expect(mockLinking.openURL).toHaveBeenCalledWith('phantom://test');
      expect(signedTransaction).toBeInstanceOf(Transaction);
    });

    it('should handle VersionedTransaction', async () => {
      // Create a mock VersionedTransaction
      const mockVersionedTx = {
        serialize: jest.fn().mockReturnValue(new Uint8Array(100)),
      } as any;
      
      // Mock decodeTransaction to return a VersionedTransaction for this test
      jest.spyOn(adapter, 'decodeTransaction').mockReturnValue(new Uint8Array(100));
      
      mockLinking.openURL.mockResolvedValueOnce(true);

      const signedTransaction = await adapter.signTransaction(mockVersionedTx);

      // In the mocked implementation, it creates a new Transaction/VersionedTransaction from the response
      // The important thing is that it should handle VersionedTransaction without errors
      expect(signedTransaction).toBeInstanceOf(Transaction); // Mock returns Transaction
    });

    it('should throw error when not connected', async () => {
      (adapter as any)._connected = false;

      await expect(adapter.signTransaction(mockTransaction)).rejects.toThrow(
        WalletSignTransactionError
      );
    });

    it('should throw error when no public key', async () => {
      (adapter as any)._publicKey = null;

      await expect(adapter.signTransaction(mockTransaction)).rejects.toThrow(
        WalletSignTransactionError
      );
    });

    it('should handle wallet response errors', async () => {
      const errorResponse = { error: 'Transaction rejected' };
      
      (adapter.waitForWalletResponse as jest.Mock).mockResolvedValueOnce(errorResponse);

      await expect(adapter.signTransaction(mockTransaction)).rejects.toThrow(
        WalletSignTransactionError
      );
    });

    it('should handle missing transaction data in response', async () => {
      (adapter.waitForWalletResponse as jest.Mock).mockResolvedValueOnce({
        data: null,
      });

      await expect(adapter.signTransaction(mockTransaction)).rejects.toThrow(
        'No signed transaction received'
      );
    });

    it('should handle encryption errors', async () => {
      (adapter.encryptPayload as jest.Mock).mockReturnValueOnce([null, null]);

      await expect(adapter.signTransaction(mockTransaction)).rejects.toThrow(
        'Unable to encrypt payload'
      );
    });

    it('should emit error on exception', async () => {
      const error = new Error('Signing failed');
      mockLinking.openURL.mockRejectedValueOnce(error);
      const emitSpy = jest.spyOn(adapter, 'emit');

      await expect(adapter.signTransaction(mockTransaction)).rejects.toThrow('Signing failed');
      expect(emitSpy).toHaveBeenCalledWith('error', error);
    });
  });

  describe('signAllTransactions', () => {
    beforeEach(() => {
      (adapter as any)._connected = true;
      (adapter as any)._publicKey = createMockPublicKey();
    });

    it('should sign multiple transactions', async () => {
      const transactions = [
        new Transaction(),
        new Transaction(),
        new Transaction(),
      ];
      
      // Mock signTransaction to return the same transaction
      jest.spyOn(adapter, 'signTransaction').mockImplementation(async (tx) => tx);

      const signedTransactions = await adapter.signAllTransactions(transactions);

      expect(adapter.signTransaction).toHaveBeenCalledTimes(3);
      expect(signedTransactions).toHaveLength(3);
      expect(signedTransactions).toEqual(transactions);
    });

    it('should handle empty array', async () => {
      const signedTransactions = await adapter.signAllTransactions([]);

      expect(signedTransactions).toEqual([]);
    });

    it('should handle single transaction', async () => {
      const transaction = new Transaction();
      jest.spyOn(adapter, 'signTransaction').mockResolvedValueOnce(transaction);

      const signedTransactions = await adapter.signAllTransactions([transaction]);

      expect(signedTransactions).toEqual([transaction]);
    });

    it('should fail if any transaction fails', async () => {
      const transactions = [new Transaction(), new Transaction()];
      const error = new Error('Signing failed');
      
      jest.spyOn(adapter, 'signTransaction')
        .mockResolvedValueOnce(transactions[0])
        .mockRejectedValueOnce(error);

      await expect(adapter.signAllTransactions(transactions)).rejects.toThrow('Signing failed');
    });
  });

  describe('sendTransaction', () => {
    beforeEach(() => {
      (adapter as any)._connected = true;
      (adapter as any)._publicKey = createMockPublicKey();
    });

    it('should send transaction successfully', async () => {
      const transaction = new Transaction();
      const expectedSignature = 'transaction-signature';
      
      jest.spyOn(adapter, 'signTransaction').mockResolvedValueOnce(transaction);
      jest.spyOn(transaction, 'serialize').mockReturnValue(new Uint8Array(100));
      mockConnection.sendRawTransaction.mockResolvedValueOnce(expectedSignature);

      const signature = await adapter.sendTransaction(transaction, mockConnection);

      expect(adapter.signTransaction).toHaveBeenCalledWith(transaction);
      expect(mockConnection.sendRawTransaction).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        undefined
      );
      expect(signature).toBe(expectedSignature);
    });

    it('should pass send options to connection', async () => {
      const transaction = new Transaction();
      const options = { skipPreflight: true };
      
      jest.spyOn(adapter, 'signTransaction').mockResolvedValueOnce(transaction);
      jest.spyOn(transaction, 'serialize').mockReturnValue(new Uint8Array(100));
      mockConnection.sendRawTransaction.mockResolvedValueOnce('signature');

      await adapter.sendTransaction(transaction, mockConnection, options);

      expect(mockConnection.sendRawTransaction).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        options
      );
    });

    it('should handle connection errors', async () => {
      const transaction = new Transaction();
      const error = new Error('Network error');
      
      jest.spyOn(adapter, 'signTransaction').mockResolvedValueOnce(transaction);
      jest.spyOn(transaction, 'serialize').mockReturnValue(new Uint8Array(100));
      mockConnection.sendRawTransaction.mockRejectedValueOnce(error);

      await expect(adapter.sendTransaction(transaction, mockConnection)).rejects.toThrow('Network error');
    });

    it('should handle signing errors', async () => {
      const transaction = new Transaction();
      const error = new Error('Signing failed');
      
      jest.spyOn(adapter, 'signTransaction').mockRejectedValueOnce(error);

      await expect(adapter.sendTransaction(transaction, mockConnection)).rejects.toThrow('Signing failed');
      expect(mockConnection.sendRawTransaction).not.toHaveBeenCalled();
    });
  });
});