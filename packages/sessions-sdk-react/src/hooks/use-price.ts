import { useCallback } from "react";
import { z } from "zod";

import { useData } from "../components/component-library/useData/index.js";

export const usePrice = (mint: string) => {
  const getPriceData = useCallback(() => getPrice(mint), [mint]);

  return useData(["price", mint], getPriceData, { refreshInterval: 2000 });
};

export const getPrice = async (mint: string) => {
  const priceUrl = new URL("https://api.fogo.io/api/token-price");
  priceUrl.searchParams.set("mint", mint);

  const response = await fetch(priceUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch price: ${response.status.toString()} ${response.statusText}`,
    );
  }

  return priceSchema.parse(await response.json());
};

const priceSchema = z.number();
