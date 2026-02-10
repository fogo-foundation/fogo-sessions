import { VersionedTransaction } from "@solana/web3.js";

export const parseVersionedTransactionBase64 = (
  value: string,
): VersionedTransaction | null => {
  if (!value) return null;
  try {
    const buffer = Buffer.from(value, "base64");
    return VersionedTransaction.deserialize(new Uint8Array(buffer));
  } catch {
    return null;
  }
};

export const normalizeVersionedTransactionBase64 = (
  value: string,
): string | null => {
  const parsed = parseVersionedTransactionBase64(value);
  if (!parsed) return null;
  return Buffer.from(parsed.serialize()).toString("base64");
};
