import type { PublicKey } from "@solana/web3.js";
import { useMemo } from "react";

export const TruncateKey = ({ keyValue }: { keyValue: PublicKey }) =>
  useMemo(() => {
    const strKey = keyValue.toBase58();
    return `${strKey.slice(0, 4)}...${strKey.slice(-4)}`;
  }, [keyValue]);
