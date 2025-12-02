"use client";

import { Network } from "@fogo/sessions-sdk-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { ComponentProps } from "react";
import { createContext, Suspense, use } from "react";

const NetworkContext = createContext<
  ReturnType<typeof useNetworkContext> | undefined
>(undefined);

type Props = Omit<ComponentProps<typeof NetworkContext>, "value">;

export const FogoNetworkProvider = (props: Props) => (
  <Suspense>
    <FogoNetworkProviderImpl {...props} />
  </Suspense>
);

const FogoNetworkProviderImpl = (props: Props) => {
  const networkContext = useNetworkContext();

  return <NetworkContext value={networkContext} {...props} />;
};

const useNetworkContext = () => {
  const [network, setNetwork] = useQueryState(
    "network",
    parseAsStringLiteral(["mainnet", "testnet"] as const).withDefault(
      "mainnet",
    ),
  );
  return {
    network: NETWORK_QUERY_PARAM_TO_NETWORK[network],
    setNetwork: (network: Network) =>
      setNetwork(NETWORK_TO_NETWORK_QUERY_PARAM[network]),
  };
};

const NETWORK_QUERY_PARAM_TO_NETWORK = {
  mainnet: Network.Mainnet,
  testnet: Network.Testnet,
} as const satisfies Record<string, Network>;

const NETWORK_TO_NETWORK_QUERY_PARAM = {
  [Network.Mainnet]: "mainnet",
  [Network.Testnet]: "testnet",
} as const satisfies Record<Network, string>;

export const useNetwork = () => {
  const value = use(NetworkContext);
  if (value === undefined) {
    throw new NotInitializedError();
  } else {
    return value;
  }
};

class NotInitializedError extends Error {
  constructor() {
    super("This component must be contained within a <FogoNetworkProvider>");
    this.name = "NotInitializedError";
  }
}
