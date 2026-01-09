import {
  findRegistryPda,
  findReverseRecordPda,
  fetchMaybeReverseRecord,
  fetchMaybeNameRecord,
} from "@fogolend/fns-client";
import { fromLegacyPublicKey } from "@solana/compat";
import type { Address, Rpc, SolanaRpcApi } from "@solana/kit";
import type { PublicKey } from "@solana/web3.js";
import { useCallback, useMemo } from "react";

import { TruncateKey } from "./truncate-key.js";
import { useRpc, useSessionContext } from "../hooks/use-session.js";
import { StateType, useData } from "./component-library/useData/index.js";

type Props = {
  address: PublicKey;
};

/**
 * Component that displays an FNS name if available, otherwise shows truncated
 * address.
 */
export const DisplayAddress = ({ address }: Props) => {
  const fnsNameState = useFNSReverseRecordName(address);
  const fnsName =
    fnsNameState.type === StateType.Loaded ? fnsNameState.data : undefined;
  return fnsName ?? <TruncateKey keyValue={address} />;
};

const useFNSReverseRecordName = (owner: PublicKey) => {
  const { network } = useSessionContext();
  const rpc = useRpc();

  const key = useMemo(
    () => ["fns-reverse-record", network, owner.toBase58()],
    [owner],
  );

  const fetchName = useCallback(
    () => fetchNameImpl(rpc, fromLegacyPublicKey(owner)),
    [owner, rpc],
  );

  return useData<string | undefined>(key, fetchName, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
};

const REGISTRY_SEED = 42;

const fetchNameImpl = async (
  rpc: Rpc<SolanaRpcApi>,
  owner: Address,
): Promise<string | undefined> => {
  const [registry] = await findRegistryPda({ seed: REGISTRY_SEED });
  const [reverseRecordPda] = await findReverseRecordPda({ registry, owner });
  const reverseRecord = await fetchMaybeReverseRecord(rpc, reverseRecordPda);
  return reverseRecord.exists
    ? await getNameFromReverseRecord(rpc, reverseRecord.data.nameRecord)
    : undefined;
};

const getNameFromReverseRecord = async (
  rpc: Rpc<SolanaRpcApi>,
  reverseRecord: Address,
): Promise<string | undefined> => {
  const nameRecord = await fetchMaybeNameRecord(rpc, reverseRecord);
  return nameRecord.exists
    ? `${decodeName(nameRecord.data.name)}.fogo`
    : undefined;
};

const decodeName = (nameBytes: number[]) => {
  const nullIndex = nameBytes.indexOf(0);
  return new TextDecoder().decode(
    new Uint8Array(
      nullIndex === -1 ? nameBytes : nameBytes.slice(0, nullIndex),
    ),
  );
};
