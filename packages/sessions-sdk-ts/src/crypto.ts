import bs58 from "bs58";

/**
 * Sign a message using a CryptoKeyPair session key
 * @param publicPrivateKeyPair - The public private key pair to sign the message with
 * @param message - The message to sign
 * @returns The signature of the message
 */
export const signMessageWithKey = async (
  publicPrivateKeyPair: CryptoKeyPair,
  message: string,
) => {
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" },
    publicPrivateKeyPair.privateKey,
    new TextEncoder().encode(message),
  );
  return bs58.encode(new Uint8Array(signature));
};

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
): Promise<boolean> => {
  const isValid = await crypto.subtle.verify(
    { name: "Ed25519" },
    publicKey,
    bs58.decode(signature),
    new TextEncoder().encode(message),
  );

  return isValid;
};

/**
 * Import a public key into a CryptoKey
 * @param publicKey - The public key to import
 * @returns The imported CryptoKey
 */
export const importKey = async (publicKey: string) => {
  return await crypto.subtle.importKey(
    "raw",
    new Uint8Array(bs58.decode(publicKey)),
    { name: "Ed25519" },
    false,
    ["verify"],
  );
};
