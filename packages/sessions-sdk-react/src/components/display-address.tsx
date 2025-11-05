import type { PublicKey } from "@solana/web3.js";

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
 */
export const DisplayAddress = ({ address }: Props) => {
  const fnsNameState = useFNSReverseRecordName(address);

  if (fnsNameState.type === StateType.Loaded && fnsNameState.data) {
    return <>{fnsNameState.data}.fogo</>;
  }

  return <TruncateKey keyValue={address} />;
};
