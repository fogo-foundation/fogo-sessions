import {
  safeFetchMetadata,
  findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as metaplexPublicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { getMint } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useCallback } from "react";

import { useData } from "./use-data.js";

export { StateType } from "./use-data.js";

export type Metadata = Awaited<ReturnType<typeof getTokenMetadata>>;

export const useTokenMetadata = (mint: PublicKey) => {
  const { connection } = useConnection();
  const getMetadata = useCallback(
    async () => getTokenMetadata(connection, mint),
    [mint, connection],
  );
  return useData(["tokenMetadata", mint.toBase58()], getMetadata, {});
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
