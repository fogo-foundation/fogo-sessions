import { z } from "zod";

export const getPrices = async (mints: string[]) => {
//   const priceUrl = new URL("https://api.fogo.io/api/token-price");
//   for (const mint of mints) {
//     priceUrl.searchParams.append("mint[]", mint);
//   }
//   const priceResult = await fetch(priceUrl);
//   return priceSchema.parse(await priceResult.json());
    return Object.fromEntries(mints.map((mint) => [mint, 2]));
};

const priceSchema = z.record(
  z.string(),
  z.number().min(0),
);
