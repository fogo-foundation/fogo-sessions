import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { z } from "zod";

import {
  importKey,
  signMessageWithKey,
  verifyMessageWithKey,
} from "./crypto.js";
import type { Session } from "./session.js";
import { getSessionAccount } from "./session.js";

const loginTokenPayloadSchema = z.object({
  iat: z.number(),
  sessionPublicKey: z.string(),
});

/**
 * Create a login token signed with the session key
 * @param session - The session to create a login token for
 * @returns The login token
 */
export const createLogInToken = async (session: Session) => {
  const payload = {
    // ...we can pass any arbitrary data we want to sign here...
    iat: Date.now(),
    sessionPublicKey: session.sessionPublicKey.toBase58(),
  };

  const message = JSON.stringify(payload);

  // Sign the payload with the session private key
  const signature = await signMessageWithKey(session.sessionKey, message);

  // Return base58(message) + base58(signature)
  return `${bs58.encode(new TextEncoder().encode(message))}.${signature}`;
};

/**
 * Verify a login token
 * @param token - The login token to verify against the session public key
 * @param connection - The connection to use to get the session account
 * @returns The session account if the token is valid, otherwise undefined
 */
export const verifyLogInToken = async (
  token: string,
  connection: Connection,
) => {
  const [rawMessage, signature] = token.split(".");
  if (!rawMessage || !signature) return;

  // Decode + parse payload
  const messageStr = new TextDecoder().decode(bs58.decode(rawMessage));
  const payload = loginTokenPayloadSchema.parse(JSON.parse(messageStr));

  // Verify signature with sessionPublicKey
  const sessionCryptoKey = await importKey(payload.sessionPublicKey);
  const isValid = await verifyMessageWithKey(
    sessionCryptoKey,
    messageStr,
    signature,
  );
  if (!isValid) return;

  const sessionAccount = await getSessionAccount(
    connection,
    new PublicKey(payload.sessionPublicKey),
  );
  if (!sessionAccount) return;

  if (sessionAccount.expiration.getTime() < Date.now()) {
    throw new Error("The session associated with this login token has expired");
  }

  return sessionAccount;
};

