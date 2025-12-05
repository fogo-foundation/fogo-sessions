import { useCallback } from "react";
import { z } from "zod";

import { useData } from "./use-data.js";

export const usePrice = (mint: string) => {
  const getPriceData = useCallback(() => getPrice(mint), [mint]);

  return useData(["price", mint], getPriceData, { refreshInterval: 2000 });
};

export const getPrice = async (mint: string) => {
  const priceUrl = new URL("https://api.fogo.io/api/token-price");
  priceUrl.searchParams.append("mint", mint);

  const response = await fetch(priceUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch price: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const price = priceSchema.parse(data);
  return price;
};

const priceSchema = z.number();
