import { getMint } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { useCallback, useEffect } from "react";

import { getMetadata } from "../get-metadata.js";
import { StateType, useData } from "./use-data.js";
import { useConnection, useSessionContext } from "./use-session.js";
import type { Network } from "@fogo/sessions-sdk";

export { StateType } from "./use-data.js";

export type Metadata = Awaited<ReturnType<typeof getTokenMetadata>>;

export const useTokenMetadata = (mint: PublicKey) => {
  const connection = useConnection();
  const { network } = useSessionContext();
  const getMetadata = useCallback(
    async () => getTokenMetadata(connection, mint, network),
    [mint, connection, network],
  );
  const data = useData(
    ["tokenMetadata", network, mint.toBase58()],
    getMetadata,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnMount: false,
      revalidateOnReconnect: false,
    },
  );

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

const getTokenMetadata = async (connection: Connection, mint: PublicKey, network: Network) => {
  const mintAsString = mint.toString();
  const [mintInfo, metadata] = await Promise.all([
    getMint(connection, mint),
    getMetadata([mintAsString], network).then((meta) => meta[mintAsString]),
  ]);

  return { ...mintInfo, ...metadata };
};
