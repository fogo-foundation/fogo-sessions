import { useMemo, useCallback } from "react";
import { mutate } from "swr";

import type { EstablishedSessionState } from "./session-provider.js";
import { getCacheKey } from "./use-token-account-data.js";

const FAUCET_URL = "https://gas.zip/faucet/fogo";

export const useFaucet = (sessionState: EstablishedSessionState) => {
  const faucetUrl = useMemo(() => {
    const url = new URL(FAUCET_URL);
    url.searchParams.set("address", sessionState.walletPublicKey.toBase58());
    return url;
  }, [sessionState]);

  const showFaucet = useCallback(() => {
    const windowRef = window.open(
      faucetUrl,
      "Fogo Faucet",
      "height=800,width=700",
    );
    if (windowRef !== null) {
      const interval = setInterval(() => {
        if (windowRef.closed) {
          clearInterval(interval);
          mutate(getCacheKey(sessionState.walletPublicKey)).catch(
            (error: unknown) => {
              // eslint-disable-next-line no-console
              console.error("Failed to update token account data", error);
            },
          );
        }
      }, 100);
    }
  }, [sessionState, faucetUrl]);

  return useMemo(() => ({ showFaucet, faucetUrl }), [showFaucet, faucetUrl]);
};
