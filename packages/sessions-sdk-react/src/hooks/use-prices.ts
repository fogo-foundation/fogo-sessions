// import { z } from "zod";
import { useData } from "./use-data.js";
import { useCallback } from "react";

export const usePrices = (
    mints: string[]
) => {
    const getPriceData = useCallback(
        () => getPrices(mints),
        [mints],
    );

    return useData(
        ["prices", mints],
        getPriceData,
        { refreshInterval: 2000 }
    );
}

// TODO: uncomment when endpoint is live
export const getPrices = async (mints: string[]) => {
//   const priceUrl = new URL("https://api.fogo.io/api/token-price");
//   for (const mint of mints) {
//     priceUrl.searchParams.append("mint[]", mint);
//   }
//   const priceResult = await fetch(priceUrl);
//   return priceSchema.parse(await priceResult.json());
    return Object.fromEntries(mints.map((mint) => [mint, 1 + (Math.random() - 0.5) * 0.1 ]));
};

// const priceSchema = z.record(
//   z.string(),
//   z.bigint(),
// );
