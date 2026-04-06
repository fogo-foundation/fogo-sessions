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

export const isValidTxHash = (value: string): boolean => {
  try {
    // Solana tx signatures are 64 bytes base58-encoded.
    return bs58.decode(value).length === 64;
  } catch {
    return false;
  }
};

export type TransactionInput =
  | { type: "serialized"; value: string }
  | { type: "hash"; value: string };

export const parseTransactionInput = (value: string): TransactionInput => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Transaction input cannot be empty");
  if (normalizeVersionedTransactionBase64(trimmed))
    return { type: "serialized", value: trimmed };
  if (isValidTxHash(trimmed)) return { type: "hash", value: trimmed };
  throw new Error("Invalid transaction input");
};
