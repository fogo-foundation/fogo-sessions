import { PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';

export type TruncateKeyProps = {
  keyValue: PublicKey;
}

export const TruncateKey = ({ keyValue }: TruncateKeyProps) =>
  useMemo(() => {
    const strKey = keyValue.toBase58();
    return `${strKey.slice(0, 4)}...${strKey.slice(-4)}`;
  }, [keyValue]);
