import type{ Address, SignatureBytes, ReadonlyUint8Array } from "@solana/kit";
import { getPublicKeyFromAddress, verifySignature } from "@solana/kit";
import { serialize } from "@xlabs-xyz/binary-layout";
import type {RoUint8Array} from "@xlabs-xyz/const-utils";
import type {Ix} from "@xlabs-xyz/svm";
import {  offchainMessageLayout, composeEd25519VerifyIx } from "@xlabs-xyz/svm";
import { bytes } from "@xlabs-xyz/utils";

export type SigningFunc = (msg: RoUint8Array) => Promise<Uint8Array>;

export type KV = Readonly<Record<string, string>>;

export type Intent = {
  description: string;
  parameters:  KV;
};

export async function composeEd25519IntentVerifyIx(
  owner:       Address,
  signMessage: SigningFunc,
  intent:      Intent,
): Promise<Ix> {
  const inputMessage = stringifyIntent(intent);
  const bytesMessage = bytes.encode(inputMessage);
  const signature    = await signMessage(bytesMessage);
  const message      = await addPrefixIfNeeded(owner, signature, inputMessage, bytesMessage);
  return composeEd25519VerifyIx({ publicKey: owner, message, signature });
}

const stringifyIntent = (intent: Intent) =>
  intent.description + "\n" +
    Object.entries(intent.parameters).map(([key, value]) =>
      [key, ":", value.startsWith("\n") ? "" : " ", value].join(""),
    ).join("\n");

//wallets may (should!) add an offchain message prefix to the message before signing
const addPrefixIfNeeded = async (
  owner:        Address,
  signature:    RoUint8Array,
  message:      string,
  bytesMessage: RoUint8Array,
): Promise<RoUint8Array> => {
  const publicKey = await getPublicKeyFromAddress(owner);
  if (await verifySignature(
    publicKey,
    signature as SignatureBytes,
    bytesMessage as ReadonlyUint8Array
  ))
    return bytesMessage;

  const messageFormat = "LimitedUtf8" as const;
  const prefixed = serialize(offchainMessageLayout, { messageFormat, message });
  if (await verifySignature(publicKey, signature as SignatureBytes, prefixed))
    return prefixed;

  throw new Error("Can't verify wallet's provided signature for the given intent!");
};

