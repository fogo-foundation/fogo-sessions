import { Network } from "@fogo/sessions-sdk";
import { z } from "zod";

const NETWORK_TO_QUERY_PARAM: Record<Network, string> = {
  [Network.Mainnet]: "mainnet",
  [Network.Testnet]: "testnet",
};

export const getMetadata = async (mints: string[], network: Network) => {
  const metadataUrl = new URL("https://api.fogo.io/api/token-metadata");
  for (const mint of mints) {
    metadataUrl.searchParams.append("mint[]", mint);
  }
  metadataUrl.searchParams.append("network", NETWORK_TO_QUERY_PARAM[network]);
  const metadataResult = await fetch(metadataUrl);
  return metadataSchema.parse(await metadataResult.json());
};

const metadataSchema = z.record(
  z.string(),
  z.object({
    name: z.string(),
    symbol: z.string().optional(),
    image: z.string(),
  }),
);
