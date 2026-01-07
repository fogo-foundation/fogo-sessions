"use client";

import { Network } from "@fogo/sessions-sdk-react";
import { Select } from "@fogo/component-library/Select";
import { useCallback } from "react";

import { useNetwork } from "./network-provider";
import { useLogger } from "../../hooks/use-logger";

const NETWORKS = [
  { key: Network.Mainnet, label: "Mainnet" },
  { key: Network.Testnet, label: "Testnet" },
];

export const NetworkSelect = () => {
  const logger = useLogger();
  const { network, setNetwork } = useNetwork();

  const updateNetwork = useCallback(
    (network: Network) => {
      setNetwork(network).catch((error: unknown) => {
        logger.error("Failed to update network query param", error);
      });
    },
    [setNetwork, logger],
  );

  return (
    <Select
      name="network"
      aria-label="Select Network"
      items={NETWORKS}
      selectedKey={network}
      // @ts-expect-error for some reason, react-aria insists on typing this as
      // Key, rather than narrowing to the type that is passed in as `items`.
      onSelectionChange={updateNetwork}
    />
  );
};
