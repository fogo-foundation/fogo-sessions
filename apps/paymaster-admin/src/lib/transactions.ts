import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

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

/** Solana tx signatures are 64 bytes base58-encoded. */
export const isValidTxHash = (value: string): boolean => {
  try {
    return bs58.decode(value.trim()).length === 64;
  } catch {
    return false;
  }
};

export type TransactionInputType = "serialized" | "hash" | "invalid";

export const classifyTransactionInput = (
  value: string,
): TransactionInputType => {
  const trimmed = value.trim();
  if (!trimmed) return "invalid";
  if (normalizeVersionedTransactionBase64(trimmed)) return "serialized";
  if (isValidTxHash(trimmed)) return "hash";
  return "invalid";
};
