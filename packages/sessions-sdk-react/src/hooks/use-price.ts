import { useCallback } from "react";
import { z } from "zod";

import { useData } from "./use-data.js";

export const usePrice = (mint: string) => {
  const getPriceData = useCallback(() => getPrice(mint), [mint]);

  return useData(["price", mint], getPriceData, { refreshInterval: 2000 });
};

// TODO: uncomment when endpoint is live
export const getPrice = async (_mint: string) => {
  const priceUrl = new URL("https://api.fogo.io/api/token-price");
  const response = await fetch(priceUrl);
  const priceMap = priceSchema.parse(await response.json());
  return priceMap[_mint];
};

const priceSchema = z.record(z.string(), z.bigint());
