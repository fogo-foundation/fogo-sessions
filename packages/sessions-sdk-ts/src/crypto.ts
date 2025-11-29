import { base58, bytes } from "@xlabs-xyz/utils";

/**
 * Sign a message using a CryptoKeyPair session key
 * @param publicPrivateKeyPair - The public private key pair to sign the message with
 * @param message - The message to sign
 * @returns The signature of the message
 */
export const signMessageWithKey = async (
  publicPrivateKeyPair: CryptoKeyPair,
  message: string,
): Promise<string> =>
  crypto.subtle.sign(
    { name: "Ed25519" },
    publicPrivateKeyPair.privateKey,
    bytes.encode(message),
  ).then((signature) => base58.encode(new Uint8Array(signature)));


/**
 * Verify a message with a CryptoKey public key
 * @param publicKey - The public key of the session key
 * @param message - The message to verify
 * @param signature - The signature to verify
 * @returns True if the message and signature are valid, false otherwise
 */
export const verifyMessageWithKey = async (
  publicKey: CryptoKey,
  message: string,
  signature: string,
): Promise<boolean> =>
  crypto.subtle.verify(
    { name: "Ed25519" },
    publicKey,
    base58.decode(signature),
    bytes.encode(message),
  );


/**
 * Import a public key into a CryptoKey
 * @param publicKey - The public key to import
 * @returns The imported CryptoKey
 */
export const importKey = (publicKey: string) =>
  crypto.subtle.importKey(
    "raw",
    base58.decode(publicKey),
    { name: "Ed25519" },
    false,
    ["verify"],
  );
