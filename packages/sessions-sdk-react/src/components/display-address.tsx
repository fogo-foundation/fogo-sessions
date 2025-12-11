import type { PublicKey } from "@solana/web3.js";

import styles from "./display-address.module.css";
import { TruncateKey } from "./truncate-key.js";
import {
  StateType,
  useFNSReverseRecordName,
} from "../hooks/use-fns-reverse-record.js";

type Props = {
  address: PublicKey;
};

/**
 * Component that displays an FNS name if available, otherwise shows truncated address.
 * Shows a loading skeleton while fetching the FNS name.
 */
export const DisplayAddress = ({ address }: Props) => {
  const fnsNameState = useFNSReverseRecordName(address);

  switch (fnsNameState.type) {
    case StateType.Loading: {
      return <span className={styles.skeleton} aria-label="Loading name" />;
    }
    case StateType.Loaded: {
      return fnsNameState.data ? (
        `${fnsNameState.data}.fogo`
      ) : (
        <TruncateKey keyValue={address} />
      );
    }
    case StateType.NotLoaded:
    case StateType.Error: {
      return <TruncateKey keyValue={address} />;
    }
  }
};
