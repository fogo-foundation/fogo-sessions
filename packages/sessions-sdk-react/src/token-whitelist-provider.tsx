import { PublicKey } from "@solana/web3.js";
import type { ComponentProps } from "react";
import { createContext, use } from "react";

export const TokenWhitelistProvider = (
  props: Omit<ComponentProps<typeof TokenWhitelistContext>, "value"> & {
    value: {
      tokens: PublicKey[];
      enableUnlimited: boolean;
    };
  },
) => <TokenWhitelistContext {...props} />;

export const useTokenWhitelist = () => {
  const value = use(TokenWhitelistContext);
  if (value === undefined) {
    throw new NotInitializedError();
  } else {
    return value;
  }
};

const TokenWhitelistContext = createContext<
  { tokens: PublicKey[]; enableUnlimited: boolean } | undefined
>(undefined);

class NotInitializedError extends Error {
  constructor() {
    super("This component must be contained within a <TokenWhitelistProvider>");
    this.name = "TokenWhitelistProvider";
  }
}
