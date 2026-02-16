import type { SignatureBytes } from "@solana/kit";
import { signatureBytes, verifySignature } from "@solana/kit";
import type {
  BaseSignerWalletAdapter,
  MessageSignerWalletAdapterProps,
  WalletError,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import { isWalletAdapterCompatibleStandardWallet } from "@solana/wallet-adapter-base";
import { SolanaSignMessage } from "@solana/wallet-standard-features";
import type { PublicKey } from "@solana/web3.js";
import type { SolanaMobileWalletAdapter } from "@solana-mobile/wallet-adapter-mobile";

/**
 * The BaseWalletAdapter is used by all Solana wallet types. It extends EventEmitter but the types from the EventEmitter are not present so we are creating our own
 * SolanaWallet type here that includes them and also adds some extra typings to only include the available methods and properties.
 */

export type SolanaWalletEvent = {
  connect(publicKey: PublicKey): void;
  disconnect(): void;
  error(error: WalletError): void;
  readyStateChange(readyState: WalletReadyState): void;
};

export type SolanaWalletEventEmitter = {
  on<E extends keyof SolanaWalletEvent>(
    event: E,
    listener: SolanaWalletEvent[E],
  ): void;
  off<E extends keyof SolanaWalletEvent>(
    event: E,
    listener: SolanaWalletEvent[E],
  ): void;
};

export type SolanaWallet = MessageSignerWalletAdapterProps &
  BaseSignerWalletAdapter &
  SolanaWalletEventEmitter;

export type SolanaMobileWallet = SolanaMobileWalletAdapter &
  SolanaWalletEventEmitter;

export const signWithWallet = async (
  wallet: SolanaWallet,
  message: Uint8Array,
): Promise<{ signedMessage: Uint8Array; signature: Uint8Array }> => {
  if (
    "wallet" in wallet &&
    /* @ts-expect-error The Solana wallet adapter ts types are absolutely cooked... */
    isWalletAdapterCompatibleStandardWallet(wallet.wallet) &&
    SolanaSignMessage in wallet.wallet.features
  ) {
    const account = wallet.wallet.accounts.find(
      (account) => account.address === wallet.publicKey?.toBase58(),
    );
    if (account === undefined) {
      throw new Error("Account not found in wallet standard wallet");
    } else {
      const [result] = await wallet.wallet.features[
        SolanaSignMessage
      ].signMessage({
        account,
        message,
      });
      if (result === undefined) {
        throw new Error("No signature result returned by wallet");
      } else {
        return {
          signature: result.signature,
          // It seems that, when using a Nightly wallet that is NOT backed by a
          // ledger, the `signedMessage` that Nightly returns is 1-byte
          // Uint8Array and is not actually the message that was signed.
          //
          // It also seems that some wallets (Phantom) when used with the old Nano S ledger, will return the raw message as signed message.
          // The `addLegacyOffchainMessagePrefixToMessageIfNeeded` function handles that case.
          //
          // The `signedMessage` seems to be reliable in all other wallets and
          // when using nightly with a wallet that IS backed by a ledger...
          signedMessage: await (() => {
            if (result.signedMessage.byteLength === 1) {
              return message;
            } else if (wallet.publicKey) {
              return addLegacyOffchainMessagePrefixToMessageIfNeeded(
                wallet.publicKey,
                signatureBytes(result.signature),
                result.signedMessage,
              );
            } else return result.signedMessage;
          })(),
        };
      }
    }
  } else {
    return {
      signature: await wallet.signMessage(message),
      signedMessage: message,
    };
  }
};

const serializeU16LE = (value: number) => {
  const result = new ArrayBuffer(2);
  new DataView(result).setUint16(0, value, true); // littleEndian = true
  return new Uint8Array(result);
};

const addLegacyOffchainMessagePrefixToMessageIfNeeded = async (
  walletPublicKey: PublicKey,
  signature: SignatureBytes,
  message: Uint8Array,
) => {
  const publicKey = await crypto.subtle.importKey(
    "raw",
    walletPublicKey.toBytes(),
    { name: "Ed25519" },
    true,
    ["verify"],
  );

  if (await verifySignature(publicKey, signature, message)) {
    return message;
  } else {
    // Source: https://github.com/anza-xyz/solana-sdk/blob/master/offchain-message/src/lib.rs#L162
    const messageWithOffchainMessagePrefix = Uint8Array.from([
      0xff,
      ...new TextEncoder().encode("solana offchain"),
      0,
      1,
      ...serializeU16LE(message.length),
      ...message,
    ]);
    if (
      await verifySignature(
        publicKey,
        signature,
        messageWithOffchainMessagePrefix,
      )
    ) {
      return messageWithOffchainMessagePrefix;
    } else {
      throw new Error(
        "The signature provided by the browser wallet is not valid",
      );
    }
  }
};
