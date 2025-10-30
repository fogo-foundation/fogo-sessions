// eslint-disable-next-line unicorn/prefer-node-protocol
import { Buffer } from 'buffer';

import { base58 } from '@scure/base';
import type { WalletAdapter } from '@solana/wallet-adapter-base';
import {
  BaseWalletAdapter,
  WalletAdapterNetwork,
  WalletReadyState,
} from '@solana/wallet-adapter-base';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Linking } from 'react-native';
import * as nacl from 'tweetnacl';

export type WalletResponse = {
  [key: string]: string; // Allow dynamic keys for different wallet encryption public keys
  nonce: string;
  data: string;
  error: string;
  publicKey: string;
  session: string;
}

// Base mobile wallet adapter with shared deeplink functionality
export abstract class BaseMobileWalletAdapter
  extends BaseWalletAdapter
  implements WalletAdapter {
  abstract override url: string;
  abstract deepLinkScheme: string;
  abstract universalLinkDomain: string;

  // Abstract method to get wallet-specific encryption public key parameter name
  abstract getEncryptionPublicKeyParam(): string;

  protected _connecting = false;
  protected _connected = false;
  protected _publicKey: PublicKey | undefined = undefined;
  protected _readyState = WalletReadyState.Installed;

  // Shared encryption properties
  protected session?: string;
  protected sharedSecret?: Uint8Array;
  protected dappKeyPair = nacl.box.keyPair();

  constructor(
    protected redirectUrl: string,
    protected domain?: string
  ) {
    super();
  }

  get publicKey() {
    if (this._publicKey) {
      return new PublicKey(this._publicKey);
    } else {
      throw new Error('Wallet not connected');
    }
  }

  get connecting() {
    return this._connecting;
  }

  override get connected() {
    return this._connected;
  }

  get readyState() {
    return this._readyState;
  }

  abstract override connect(): Promise<void>;
  abstract override disconnect(): Promise<void>;
  abstract signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T>;
  abstract signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]>;
  abstract signMessage(message: Uint8Array): Promise<Uint8Array>;

  protected generateRedirectUrl(): string {
    return this.redirectUrl;
  }

  protected encodeTransaction(
    transaction: Transaction | VersionedTransaction
  ): string {
    const serialized = transaction.serialize();
    return btoa(String.fromCodePoint(...serialized));
  }

  protected decodeTransaction(encodedTx: string): Uint8Array {
    const decoded = atob(encodedTx);
    const result = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      result[i] = decoded.codePointAt(i) ?? 0;
    }
    return result;
  }

  // Shared deeplink functionality
  protected buildUrl = (path: string, params: URLSearchParams) =>
    `https://${this.universalLinkDomain}/ul/v1/${path}?${params.toString()}`;

  protected decryptPayload = (
    data: string,
    nonce: string,
    sharedSecret?: Uint8Array
  ) => {
    if (!sharedSecret) throw new Error('missing shared secret');

    try {
      const encryptedData = base58.decode(data);
      const nonceBytes = base58.decode(nonce);
      const decryptedData = nacl.box.open.after(
        encryptedData,
        nonceBytes,
        sharedSecret
      );
      if (!decryptedData) {
        throw new Error('Decryption failed - invalid tag or corrupted data');
      }

      const jsonString = Buffer.from(decryptedData).toString('utf8');
      return JSON.parse(jsonString) as unknown;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Unable to decrypt data: ${errorMessage}`);
    }
  };

  protected encryptPayload(payload: unknown) {
    if (!this.sharedSecret) throw new Error('missing shared secret');

    const nonce = nacl.randomBytes(24);
    const encryptedPayload = nacl.box.after(
      Buffer.from(JSON.stringify(payload)),
      nonce,
      this.sharedSecret
    );

    return [nonce, encryptedPayload];
  }

  protected async waitForWalletResponse(): Promise<WalletResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        Linking.removeAllListeners('url');
        reject(new Error('Wallet response timeout'));
      }, 60_000); // 1 minute timeout

      const handleUrl = (url: string) => {
        clearTimeout(timeout);
        Linking.removeAllListeners('url');
        try {
          const response = this.parseResponseUrl(url);
          resolve(response);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };

      Linking.addEventListener('url', ({ url }) => { handleUrl(url); });
    });
  }

  protected parseResponseUrl(url: string): WalletResponse {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;

      const response: WalletResponse = {
        publicKey: params.get('public_key') ?? '',
        data: params.get('data') ?? '',
        session: params.get('session') ?? '',
        error: params.get('error') ?? '',
        nonce: params.get('nonce') ?? '',
      };

      // Add all other parameters to support different wallet encryption keys
      for (const [key, value] of params.entries()) {
        response[key] = value;
      }

      return response;
    } catch {
      throw new Error('Failed to parse wallet response URL');
    }
  }

  // Common connect flow with encryption
  protected async performEncryptedConnect(): Promise<void> {
    const redirectUrl = this.generateRedirectUrl();

    const params = new URLSearchParams({
      dapp_encryption_public_key: base58.encode(this.dappKeyPair.publicKey),
      cluster: WalletAdapterNetwork.Mainnet,
      app_url: this.domain ? `https://${this.domain}` : 'https://leapwallet.io',
      redirect_link: redirectUrl,
    });

    const connectUrl = this.buildUrl('connect', params);
    const responsePromise = this.waitForWalletResponse();

    await Linking.openURL(connectUrl);
    const response = await responsePromise;

    if (response.error) {
      throw new Error(response.error);
    }

    // Handle encrypted response
    const encryptionKeyParam = this.getEncryptionPublicKeyParam();
    if (response.data && response.nonce && response[encryptionKeyParam]) {
      const walletPublicKey = base58.decode(response[encryptionKeyParam]);
      const sharedSecretDapp = nacl.box.before(
        walletPublicKey,
        this.dappKeyPair.secretKey
      );

      const connectData = this.decryptPayload(
        response.data,
        response.nonce,
        sharedSecretDapp
      ) as { session: string; public_key: string };

      this.sharedSecret = sharedSecretDapp;
      this.session = connectData.session;
      this._publicKey = new PublicKey(connectData.public_key);
    } else if (response.publicKey) {
      this._publicKey = new PublicKey(response.publicKey);
    } else {
      // Check if wallet responded but has no Solana wallet configured
      if (response.data === '' && response.publicKey === '') {
        throw new Error('No Solana wallet found in your wallet app. Please create or import a Solana wallet and try connecting again.');
      }
      throw new Error('Failed to receive wallet public key. Please try connecting again.');
    }

    this._connected = true;
    this.emit('connect', this._publicKey);
  }
}

// Wallet factory moved to separate file to avoid circular dependency
