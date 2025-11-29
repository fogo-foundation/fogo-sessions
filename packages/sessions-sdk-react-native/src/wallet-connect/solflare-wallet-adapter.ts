import { base58 } from '@scure/base';
import type {
  SendTransactionOptions,
  WalletName,
} from '@solana/wallet-adapter-base';
import {
  WalletError,
  WalletSignMessageError,
  WalletSignTransactionError,
} from '@solana/wallet-adapter-base';
import type {
  TransactionSignature,
  TransactionVersion,
} from '@solana/web3.js';
import {
  Connection,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { Linking } from 'react-native';

import { BaseMobileWalletAdapter } from './wallet-connect';

// Solflare Mobile Wallet Adapter
export class SolflareMobileWalletAdapter extends BaseMobileWalletAdapter {
  name = 'Solflare' as WalletName;
  url = 'https://solflare.com';
  deepLinkScheme = 'solflare';
  universalLinkDomain = 'solflare.com';
  icon = '';
  readonly supportedTransactionVersions: ReadonlySet<TransactionVersion> =
    new Set(['legacy', 0]);

  getEncryptionPublicKeyParam(): string {
    return 'solflare_encryption_public_key';
  }

  async connect(): Promise<void> {
    try {
      this._connecting = true;
      await this.performEncryptedConnect();
    } catch (error: unknown) {
      this.emit('error', new WalletError(error instanceof Error ? error.message : String(error), error));
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async disconnect(): Promise<void> {
    this._publicKey = undefined;
    this._connected = false;
    this.emit('disconnect');
  }

  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendTransactionOptions
  ): Promise<TransactionSignature> {
    const signedTransaction = await this.signTransaction(transaction);
    return await connection.sendRawTransaction(
      signedTransaction.serialize(),
      options
    );
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> {
    if (!this._connected || !this._publicKey) {
      throw new WalletSignTransactionError('Wallet not connected');
    }

    try {
      const payload = {
        session: this.session,
        transaction: base58.encode(transaction.serialize()),
      };

      const [nonce, encryptedPayload] = this.encryptPayload(payload);
      if (!nonce || !encryptedPayload) {
        throw new Error('Unable to encrypt payload');
      }
      const params = new URLSearchParams({
        dapp_encryption_public_key: base58.encode(this.dappKeyPair.publicKey),
        nonce: base58.encode(nonce),
        redirect_link: this.generateRedirectUrl(),
        payload: base58.encode(encryptedPayload),
      });
      const url = this.buildUrl('signTransaction', params);

      const responsePromise = this.waitForWalletResponse();
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new WalletSignTransactionError('Cannot open Solflare wallet');
      }
      await Linking.openURL(url);

      const response = await responsePromise;

      if (response.error) {
        throw new WalletSignTransactionError(response.error);
      }

      if (!response.data) {
        throw new WalletSignTransactionError('No signed transaction received');
      }

      // Deserialize the signed transaction
      const signedTxData = this.decodeTransaction(response.data);
      const signedTransaction =
        transaction instanceof VersionedTransaction
          ? VersionedTransaction.deserialize(signedTxData)
          : Transaction.from(signedTxData);

      return signedTransaction as T;
    } catch (error: unknown) {
      this.emit('error', new WalletError(error instanceof Error ? error.message : String(error), error));
      throw error;
    }
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]> {
    const signedTransactions: T[] = [];
    for (const transaction of transactions) {
      const signedTx = await this.signTransaction(transaction);
      signedTransactions.push(signedTx);
    }
    return signedTransactions;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._connected || !this._publicKey) {
      throw new WalletSignMessageError('Wallet not connected');
    }

    try {
      const payload = {
        session: this.session,
        message: base58.encode(message),
      };
      const [nonce, encryptedPayload] = this.encryptPayload(payload);
      if (!nonce || !encryptedPayload) {
        throw new Error('Unable to generate nonce');
      }

      const params = new URLSearchParams({
        dapp_encryption_public_key: base58.encode(this.dappKeyPair.publicKey),
        nonce: base58.encode(nonce),
        redirect_link: this.generateRedirectUrl(),
        payload: base58.encode(encryptedPayload),
      });
      const url = this.buildUrl('signMessage', params);
      const responsePromise = this.waitForWalletResponse();
      await Linking.openURL(url);
      const response = await responsePromise;

      if (response.error) {
        throw new WalletSignMessageError(response.error);
      }

      if (!response.data) {
        throw new WalletSignMessageError('No signature received');
      }
      if (response.data && response.nonce) {
        const signMessageData = this.decryptPayload(
          response.data,
          response.nonce,
          this.sharedSecret
        ) as { signature: string };
        return base58.decode(signMessageData.signature);
      }
      throw new WalletSignMessageError('Unable to decrypt signed data');
    } catch (error: unknown) {
      this.emit('error', new WalletError(error instanceof Error ? error.message : String(error), error));
      throw error;
    }
  }
}
