// import { z } from "zod";

// TODO: uncomment when endpoint is live
export const getPrices = async (mints: string[]) => {
//   const priceUrl = new URL("https://api.fogo.io/api/token-price");
//   for (const mint of mints) {
//     priceUrl.searchParams.append("mint[]", mint);
//   }
//   const priceResult = await fetch(priceUrl);
//   return priceSchema.parse(await priceResult.json());
    return Object.fromEntries(mints.map((mint) => [mint, 2n]));
};

// const priceSchema = z.record(
//   z.string(),
//   z.bigint(),
// );
