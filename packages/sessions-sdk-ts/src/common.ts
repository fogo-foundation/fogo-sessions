import { IntentTransferProgram } from "@fogo/sessions-idls";
import { fromLegacyPublicKey } from "@solana/compat";
import type { SignatureBytes } from "@solana/kit";
import {
  getProgramDerivedAddress,
  verifySignature,
} from "@solana/kit";
import { PublicKey } from "@solana/web3.js";

import { Network } from "./connection.js";

export const USDC_MINT = {
  [Network.Mainnet]: "uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG",
  [Network.Testnet]: "ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND",
};

export const USDC_DECIMALS = 6;

export const serializeU16LE = (value: number) => {
  const result = new ArrayBuffer(2);
  new DataView(result).setUint16(0, value, true); // littleEndian = true
  return new Uint8Array(result);
};

// Some wallets add a prefix to the messag before signing, for example Ledger through Phantom
export const addOffchainMessagePrefixToMessageIfNeeded = async (
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
      // eslint-disable-next-line unicorn/number-literal-case
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

export const serializeKV = (data: Record<string, string>) =>
  Object.entries(data)
    .map(([key, value]) =>
      [key, ":", value.startsWith("\n") ? "" : " ", value].join(""),
    )
    .join("\n");

export const amountToString = (amount: bigint, decimals: number): string => {
  const asStr = amount.toString();
  const whole =
    asStr.length > decimals ? asStr.slice(0, asStr.length - decimals) : "0";
  const decimal =
    asStr.length > decimals ? asStr.slice(asStr.length - decimals) : asStr;
  const decimalPadded = decimal.padStart(decimals, "0");
  const decimalTruncated = decimalPadded.replace(/0+$/, "");

  return [
    whole,
    ...(decimalTruncated === "" ? [] : [".", decimalTruncated]),
  ].join("");
};

export enum NonceType {
  Transfer,
  Bridge,
}

export const NONCE_TYPE_TO_SEED: Record<NonceType, string> = {
  [NonceType.Transfer]: "nonce",
  [NonceType.Bridge]: "bridge_ntt_nonce",
};

export const getNonce = async (
  program: IntentTransferProgram,
  walletPublicKey: PublicKey,
  nonceType: NonceType,
) => {
  const [noncePda] = await getProgramDerivedAddress({
    programAddress: fromLegacyPublicKey(program.programId),
    seeds: [
      Buffer.from(NONCE_TYPE_TO_SEED[nonceType]),
      walletPublicKey.toBuffer(),
    ],
  });
  return program.account.nonce.fetchNullable(noncePda);
};

