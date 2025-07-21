import {
  safeFetchMetadata,
  findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as metaplexPublicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { getMint } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useCallback, useEffect } from "react";

import { StateType, useData } from "./use-data.js";

export { StateType } from "./use-data.js";

export type Metadata = Awaited<ReturnType<typeof getTokenMetadata>>;

export const useTokenMetadata = (mint: PublicKey) => {
  const { connection } = useConnection();
  const getMetadata = useCallback(
    async () => getTokenMetadata(connection, mint),
    [mint, connection],
  );
  const data = useData(["tokenMetadata", mint.toBase58()], getMetadata, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    revalidateOnReconnect: false,
  });

  useEffect(() => {
    if (data.type === StateType.NotLoaded) {
      data.mutate().catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch token metadata", error);
      });
    }
  }, [data]);

  return data;
};

const getTokenMetadata = async (connection: Connection, mint: PublicKey) => {
  const umi = createUmi(connection.rpcEndpoint);
  const metaplexMint = metaplexPublicKey(mint);
  const metadataAddress = findMetadataPda(umi, { mint: metaplexMint })[0];
  const [mintInfo, metadata] = await Promise.all([
    getMint(connection, mint),
    safeFetchMetadata(umi, metadataAddress),
  ]);

  return { ...mintInfo, ...metadata };
};
