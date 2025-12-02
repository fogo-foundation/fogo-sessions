// import { z } from "zod";
import { useCallback } from "react";

import { useData } from "./use-data.js";

export const usePrice = (mint: string) => {
  const getPriceData = useCallback(() => getPrice(mint), [mint]);

  return useData(["price", mint], getPriceData, { refreshInterval: 2000 });
};

// TODO: uncomment when endpoint is live
export const getPrice = async (_mint: string) => {
  //   const priceUrl = new URL("https://api.fogo.io/api/token-price");
  //   for (const mint of mints) {
  //     priceUrl.searchParams.append("mint[]", mint);
  //   }
  //   const priceResult = await fetch(priceUrl);
  //   return priceSchema.parse(await priceResult.json());
  return 1 + (Math.random() - 0.5) * 0.1; // dummy price
};

// const priceSchema = z.record(
//   z.string(),
//   z.bigint(),
// );
