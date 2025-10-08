import {
  WalletSignMessageError,
  WalletSignTransactionError,
  type SendTransactionOptions,
  type WalletName,
} from '@solana/wallet-adapter-base';
import { BaseMobileWalletAdapter } from './wallet-connect';
import {
  Connection,
  Transaction,
  VersionedTransaction,
  type TransactionSignature,
  type TransactionVersion,
} from '@solana/web3.js';
import { Linking } from 'react-native';
import { base58 } from '@scure/base';

// Backpack Mobile Wallet Adapter
export class BackpackMobileWalletAdapter extends BaseMobileWalletAdapter {
  name = 'Backpack' as WalletName;
  url = 'https://backpack.app';
  deepLinkScheme = 'backpack';
  universalLinkDomain = 'backpack.app';
  icon = '';
  readonly supportedTransactionVersions: ReadonlySet<TransactionVersion> =
    new Set(['legacy', 0]);

  getEncryptionPublicKeyParam(): string {
    return 'wallet_encryption_public_key';
  }

  async connect(): Promise<void> {
    try {
      this._connecting = true;
      await this.performEncryptedConnect();
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    this._publicKey = null;
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
      if (!nonce || !encryptedPayload)
        throw new Error('Unable to encrypt payload');
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
        throw new WalletSignTransactionError('Cannot open Backpack wallet');
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
    } catch (error: any) {
      this.emit('error', error);
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
      if (!nonce || !encryptedPayload)
        throw new Error('Unable to generate nonce');

      const params = new URLSearchParams({
        dapp_encryption_public_key: base58.encode(this.dappKeyPair.publicKey),
        nonce: base58.encode(nonce),
        redirect_link: this.generateRedirectUrl(),
        payload: base58.encode(encryptedPayload),
      });
      const url = this.buildUrl('signMessage', params);
      const responsePromise = this.waitForWalletResponse();
      //const supported = await Linking.canOpenURL(url);
      //if (!supported) {
      //  throw new WalletSignMessageError('Cannot open Backpack wallet');
      //}
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
        );
        return base58.decode(signMessageData.signature);
      } else {
        throw new WalletSignMessageError('Unable to decrypt signed data');
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }
}
