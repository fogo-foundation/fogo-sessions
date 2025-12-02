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

  if (fnsNameState.type === StateType.Loading) {
    return <span className={styles.skeleton} aria-label="Loading name" />;
  }

  if (fnsNameState.type === StateType.Loaded && fnsNameState.data) {
    return <>{fnsNameState.data}.fogo</>;
  }

  return <TruncateKey keyValue={address} />;
};
