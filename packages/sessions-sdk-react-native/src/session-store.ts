import { base58 } from '@scure/base';
import { PublicKey } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { Alert, Linking } from 'react-native';

// React Native provides crypto API via polyfills
declare const crypto: {
  subtle: {
    importKey: (format: string, keyData: BufferSource, algorithm: string, extractable: boolean, keyUsages: string[]) => Promise<unknown>;
    exportKey: (format: string, key: unknown) => Promise<ArrayBuffer>;
  };
};

const SESSION_KEY_PREFIX = 'fogo_session_';

export const getStoredSession = async (
  walletPublicKey: PublicKey
): Promise<StoredSession | undefined> => {
  try {
    const sessionKey = `${SESSION_KEY_PREFIX}${walletPublicKey.toBase58()}`;

    const storedData = await SecureStore.getItemAsync(sessionKey, {
      requireAuthentication: true,
      authenticationPrompt: 'Authenticate to access your session',
    });

    if (!storedData) {
      return undefined;
    }

    const parsed = JSON.parse(storedData) as {
      privateKeyData: string;
      publicKeyData: string;
      walletPublicKey: string;
      createdAt?: string;
      walletName?: string;
    };

    // Reconstruct keypair from stored data
    const privateKeyBytes = base58.decode(parsed.privateKeyData);
    const publicKeyBytes = base58.decode(parsed.publicKeyData);

    // Create PKCS8 format for private key (reverse of the export process)
    const pkcs8Header = new Uint8Array([
      0x30, 0x2E, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2B, 0x65, 0x70,
      0x04, 0x22, 0x04, 0x20,
    ]);
    const pkcs8PrivateKey = new Uint8Array(
      pkcs8Header.length + privateKeyBytes.length
    );
    pkcs8PrivateKey.set(pkcs8Header);
    pkcs8PrivateKey.set(privateKeyBytes, pkcs8Header.length);

    // Import keys as CryptoKey objects (compatible with polyfill)
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8PrivateKey,
      'Ed25519',
      false,
      ['sign']
    );

    const publicKey = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      'Ed25519',
      true,
      ['verify']
    );

    const keyPair = {
      privateKey,
      publicKey,
    };

    return {
      sessionKey: keyPair,
      walletPublicKey: new PublicKey(parsed.walletPublicKey),
      createdAt: parsed.createdAt ?? '',
      walletName: parsed.walletName ?? '',
    };
  } catch (error: unknown) {
    // Only show alert if authentication was actually attempted and failed
    if (
      (error as Error).message.includes('authentication') ||
      (error as Error).message.includes('cancel')
    ) {
      Alert.alert(
        'Authentication Failed',
        'Authentication is required to restore your session.'
      );
    }
    return undefined;
  }
};

export const clearStoredSession = async (
  walletPublicKey: PublicKey
): Promise<void> => {
  const sessionKey = `${SESSION_KEY_PREFIX}${walletPublicKey.toBase58()}`;

  // Remove from secure store
  await SecureStore.deleteItemAsync(sessionKey);
};

export const setStoredSession = async (
  sessionData: Omit<StoredSession, 'walletPublicKey'> & {
    walletPublicKey: PublicKey;
  }
): Promise<void> => {
  try {
    const sessionKey = `${SESSION_KEY_PREFIX}${sessionData.walletPublicKey.toBase58()}`;
    const privateKeyPcks8 = await crypto.subtle.exportKey(
      'pkcs8',
      sessionData.sessionKey.privateKey
    );
    const publicKeyRaw = await crypto.subtle.exportKey(
      'raw',
      sessionData.sessionKey.publicKey
    );
    const privateKeyBytes = privateKeyPcks8.slice(-32);

    // Extract raw key data for storage

    const storageData = {
      privateKeyData: base58.encode(new Uint8Array(privateKeyBytes)),
      publicKeyData: base58.encode(new Uint8Array(publicKeyRaw)),
      walletPublicKey: sessionData.walletPublicKey.toBase58(),
      createdAt: sessionData.createdAt ?? new Date().toISOString(),
      walletName: sessionData.walletName,
    };

    await SecureStore.setItemAsync(sessionKey, JSON.stringify(storageData), {
      requireAuthentication: true,
      authenticationPrompt: 'Please authenticate to secure your session. You can use your device passcode if biometrics are not set up.',
    });
  } catch (error: unknown) {

    // Handle specific biometric enrollment error
    if ((error as Error).message.includes('No biometrics are currently enrolled')) {
      Alert.alert(
        'Secure Authentication Required',
        'To secure your Fogo session, you need to set up either biometric authentication (Face ID/Touch ID) or a device passcode/PIN in your device settings.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Open Settings',
            onPress: () => {
              // This will open device settings where user can set up biometrics or passcode
              void Linking.openSettings();
            },
          },
        ]
      );
    } else if ((error as Error).message.includes('authentication') || (error as Error).message.includes('cancel')) {
      Alert.alert(
        'Authentication Failed',
        'Authentication is required to secure your session. Please try again.'
      );
    }

    throw error;
  }
};


export type SessionKeyPair = {
  privateKey: unknown;
  publicKey: unknown;
};

export type StoredSession = {
  sessionKey: SessionKeyPair;
  walletPublicKey: PublicKey;
  createdAt?: string;
  walletName?: string;
};

const LAST_WALLET_KEY = 'fogo_last_wallet_public_key';

export const setLastWalletPublicKey = async (
  walletPublicKey: PublicKey
): Promise<void> => {
  try {
    await SecureStore.setItemAsync(
      LAST_WALLET_KEY,
      walletPublicKey.toBase58(),
      {
        requireAuthentication: false, // Public key doesn't need authentication
      }
    );
  } catch {
    // Ignore errors when setting last wallet public key
  }
};

export const getLastWalletPublicKey = async (): Promise<
  PublicKey | undefined
> => {
  try {
    const publicKeyString = await SecureStore.getItemAsync(LAST_WALLET_KEY, {
      requireAuthentication: false, // Public key doesn't need authentication
    });

    if (!publicKeyString) {
      return undefined;
    }

    return new PublicKey(publicKeyString);
  } catch {
    return undefined;
  }
};

export const clearLastWalletPublicKey = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(LAST_WALLET_KEY);
  } catch {
    // Ignore errors when setting last wallet public key
  }
};

export const getLatestStoredSession = async (): Promise<
  StoredSession | undefined
> => {
  try {
    // Get the last wallet public key (no authentication required)
    const lastWalletPublicKey = await getLastWalletPublicKey();

    if (!lastWalletPublicKey) {
      return undefined;
    }

    // Now get the session data for this wallet (authentication required)
    const session = await getStoredSession(lastWalletPublicKey);
    return session;
  } catch {
    return undefined;
  }
};
