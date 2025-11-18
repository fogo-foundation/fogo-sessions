import type { Network } from "@fogo/sessions-sdk";
import { z } from "zod";

export const getMetadata = async (mints: string[], network: Network) => {
  const metadataUrl = new URL("https://api.fogo.io/api/token-metadata");
  for (const mint of mints) {
    metadataUrl.searchParams.append("mint[]", mint);
  }
  metadataUrl.searchParams.append("network", network.toString());
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
