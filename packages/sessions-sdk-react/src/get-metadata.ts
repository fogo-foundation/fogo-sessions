import { z } from "zod";

export const getMetadata = async (mints: string[]) => {
  const metadataUrl = new URL("https://www.api.fogo.io/api/token-metadata");
  for (const mint of mints) {
    metadataUrl.searchParams.append("mint[]", mint);
  }
  const metadataResult = await fetch(metadataUrl);
  return metadataSchema.parse(await metadataResult.json());
};

const metadataSchema = z.record(
  z.string(),
  z.object({
    name: z.string(),
    symbol: z.string(),
    image: z.string(),
  }),
);
