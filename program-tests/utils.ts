import util from "node:util";
import type { KeyPairSigner, ReadonlyUint8Array } from "@solana/kit";
import { generateKeyPairSigner, signBytes } from "@solana/kit";
import type { RoUint8Array } from "@xlabs-xyz/const-utils";

util.inspect.defaultOptions = {
  ...util.inspect.defaultOptions,
  depth: null,
  maxArrayLength: null,
  maxStringLength: null,
  breakLength: Infinity,
  compact: false,
  colors: process.stdout.isTTY,
};

export const fogoRpcUrl = "https://testnet.fogo.io";

export const fogo = (value: number) => BigInt(value) * 10n**9n;

export const genKp = () => generateKeyPairSigner().then((kp) => [kp.address, kp] as const);

export const signMessageFunc =
  (signer: KeyPairSigner) =>
    (msg: RoUint8Array) =>
      signBytes(signer.keyPair.privateKey, msg as ReadonlyUint8Array);
