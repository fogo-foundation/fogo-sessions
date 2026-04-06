import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export class PaymasterResponseError extends Error {
  constructor(statusCode: number, message: string) {
    super(`Paymaster sent a ${statusCode.toString()} response: ${message}`);
    this.name = "PaymasterResponseError";
  }
}

/**
 * Retrieves the paymaster fee amount from the paymaster server for a given transaction variation when paid in a given mint.
 */
export const getPaymasterFee = async (
  paymaster: string | URL,
  domain: string,
  variation: string,
  mint: PublicKey,
) => {
  const url = new URL("/api/fee", paymaster);
  url.searchParams.set("domain", domain);
  url.searchParams.set("variation", variation);
  url.searchParams.set("mint", mint.toBase58());
  const response = await fetch(url);

  if (response.status === 200) {
    return new BN(await response.text());
  } else {
    throw new PaymasterResponseError(response.status, await response.text());
  }
};
