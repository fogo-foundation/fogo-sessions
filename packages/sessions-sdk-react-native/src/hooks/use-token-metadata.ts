import { getMint } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { useCallback, useEffect, useState } from 'react';

import { getMetadata } from '../utils/get-metadata';
export { TokenDataStateType } from '../utils/use-data';
import { TokenDataStateType, useData } from '../utils/use-data';
import { useMobileConnection } from '../wallet-connect/wallet-provider';
export type Metadata = Awaited<ReturnType<typeof getTokenMetadata>>;

/**
 * Hook to fetch token metadata from mint address.
 *
 * @category React Hooks
 * @public
 */
export const useTokenMetadata = (mint: PublicKey) => {
  const { connection } = useMobileConnection();
  const [, setError] = useState<unknown>()
  const fetchMetadata = useCallback(
    async () => getTokenMetadata(connection, mint),
    [mint, connection]
  );
  const data = useData(['tokenMetadata', mint.toBase58()], fetchMetadata, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    revalidateOnReconnect: false,
  });

  useEffect(() => {
    if (data.type === TokenDataStateType.NotLoaded) {
      data.mutate().catch((error: unknown) => {
        setError(error)
      });
    }
  }, [data]);

  return data;
};

const getTokenMetadata = async (connection: Connection, mint: PublicKey) => {
  const mintAsString = mint.toString();
  const [mintInfo, metadata] = await Promise.all([
    getMint(connection, mint),
    getMetadata([mintAsString]).then((meta) => meta[mintAsString]),
  ]);

  return { ...mintInfo, ...metadata };
};
