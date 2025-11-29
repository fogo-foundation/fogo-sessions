import { IntentTransferProgram } from "@fogo/sessions-idls";
import { fromLegacyPublicKey } from "@solana/compat";
import { getProgramDerivedAddress } from "@solana/kit";
import { PublicKey } from "@solana/web3.js";

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

