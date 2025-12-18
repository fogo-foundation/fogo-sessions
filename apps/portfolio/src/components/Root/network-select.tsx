"use client";

import { Network } from "@fogo/sessions-sdk-react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { useCallback } from "react";
import {
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from "react-aria-components";
import { useLogger } from "../../hooks/use-logger";
import { useNetwork } from "./network-provider";
import styles from "./network-select.module.scss";

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
      className={styles.network ?? ""}
      selectedKey={network}
      // @ts-expect-error for some reason, react-aria insists on typing this as
      // Key, rather than narrowing to the type that is passed in as `items`.
      onSelectionChange={updateNetwork}
    >
      <Button className={styles.button ?? ""}>
        <SelectValue className={styles.value ?? ""} />
        <CaretDownIcon className={styles.arrow ?? ""} />
      </Button>
      <Popover offset={4} className={styles.selectPopover ?? ""}>
        <ListBox items={NETWORKS}>
          {({ key, label }) => (
            <ListBoxItem id={key} className={styles.selectItem ?? ""}>
              {label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
};
