import useSWR from "swr";
import type { z } from "zod";
import { DomainConfigWithVariationsSchema } from "../db-schema";

const fetcher = (url: string) => fetch(url).then((res) => {
    console.log("RES", res);
    return res.json();
});

export const useDomainData = (domainId: string) => {
    return useSWR<z.infer<typeof DomainConfigWithVariationsSchema>>(
        `/api/domains/${domainId}`,
        fetcher
    );
};
