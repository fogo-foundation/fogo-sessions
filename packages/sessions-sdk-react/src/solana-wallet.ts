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
  const requestedMessage = Uint8Array.from(message);
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
        message: Uint8Array.from(requestedMessage),
      });
      if (result === undefined) {
        throw new Error("No signature result returned by wallet");
      } else {
        const signature = Uint8Array.from(result.signature);
        return {
          signature,
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
              return requestedMessage;
            } else if (wallet.publicKey) {
              return normalizeSignedMessage(
                wallet.publicKey,
                signatureBytes(signature),
                requestedMessage,
                result.signedMessage,
              );
            } else return Uint8Array.from(result.signedMessage);
          })(),
        };
      }
    }
  } else {
    const signature = Uint8Array.from(
      await wallet.signMessage(Uint8Array.from(requestedMessage)),
    );
    return {
      signature,
      signedMessage: wallet.publicKey
        ? await normalizeSignedMessage(
            wallet.publicKey,
            signatureBytes(signature),
            requestedMessage,
            requestedMessage,
          )
        : requestedMessage,
    };
  }
};

const serializeU16LE = (value: number) => {
  const result = new ArrayBuffer(2);
  new DataView(result).setUint16(0, value, true); // littleEndian = true
  return new Uint8Array(result);
};

const addLegacyOffchainMessagePrefix = (message: Uint8Array) =>
  Uint8Array.from([
    0xff,
    ...new TextEncoder().encode("solana offchain"),
    0,
    1,
    ...serializeU16LE(message.length),
    ...message,
  ]);

const importEd25519PublicKey = (walletPublicKey: PublicKey) =>
  crypto.subtle.importKey(
    "raw",
    walletPublicKey.toBytes(),
    { name: "Ed25519" },
    true,
    ["verify"],
  );

const normalizeSignedMessage = async (
  walletPublicKey: PublicKey,
  signature: SignatureBytes,
  requestedMessage: Uint8Array,
  candidateSignedMessage: Uint8Array,
) => {
  const publicKey = await importEd25519PublicKey(walletPublicKey);
  const normalizedCandidate =
    candidateSignedMessage.byteLength === 1
      ? requestedMessage
      : Uint8Array.from(candidateSignedMessage);
  const candidateWithPrefix =
    addLegacyOffchainMessagePrefix(normalizedCandidate);

  if (await verifySignature(publicKey, signature, normalizedCandidate)) {
    return normalizedCandidate;
  }
  if (await verifySignature(publicKey, signature, candidateWithPrefix)) {
    return candidateWithPrefix;
  }

  if (await verifySignature(publicKey, signature, requestedMessage)) {
    return requestedMessage;
  }
  const requestedMessageWithPrefix =
    addLegacyOffchainMessagePrefix(requestedMessage);
  if (await verifySignature(publicKey, signature, requestedMessageWithPrefix)) {
    return requestedMessageWithPrefix;
  }

  throw new Error("The signature provided by the browser wallet is not valid");
};
