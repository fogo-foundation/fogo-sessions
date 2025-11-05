import { address } from "@solana/kit";
import type { PublicKey } from "@solana/web3.js";
import { useCallback, useMemo } from "react";

import { useData } from "./use-data.js";
import { useRpc } from "./use-session.js";
import { fetchMaybeNameRecord } from "../fns/accounts/name-record.js";
import { fetchMaybeReverseRecord } from "../fns/accounts/reverse-record.js";
import { findRegistryPda } from "../fns/pdas/registry.js";
import { findReverseRecordPda } from "../fns/pdas/reverse-record.js";

export { StateType } from "./use-data.js";

// The registry seed for FNS
const REGISTRY_SEED = 42;

/**
 * Hook to resolve a Fogo Name Service (FNS) name for a given address using reverse lookup.
 *
 * This hook fetches the reverse record for an address and returns the associated FNS name.
 * It uses SWR for caching and automatic revalidation.
 *
 * @param owner - The public key to resolve the FNS name for. If `undefined`, the hook will not fetch.
 *
 * @returns A state object with the following possible types:
 * - `StateType.NotLoaded`: The data has not been loaded yet
 * - `StateType.Loading`: The data is currently being fetched
 * - `StateType.Loaded`: The data has been successfully fetched (data will be a string or undefined)
 * - `StateType.Error`: An error occurred while fetching the data
 *
 * @example
 * ```tsx
 * import { useFNSReverseRecordName, StateType } from '@fogo/sessions-sdk-react';
 *
 * function MyComponent({ address }: { address: PublicKey }) {
 *   const nameState = useFNSReverseRecordName(address);
 *
 *   if (nameState.type === StateType.Loading) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   if (nameState.type === StateType.Loaded && nameState.data) {
 *     return <div>Name: {nameState.data}</div>;
 *   }
 *
 *   return <div>No FNS name found</div>;
 * }
 * ```
 */
export const useFNSReverseRecordName = (owner: PublicKey | undefined) => {
  const rpc = useRpc();

  const key = useMemo(
    () =>
      owner === undefined
        ? undefined
        : ["fns-reverse-record", owner.toBase58()],
    [owner],
  );

  const fetchName = useCallback(async () => {
    if (!owner) {
      return;
    }

    // Convert PublicKey to Address type
    const ownerAddress = address(owner.toBase58());

    // Find the registry PDA
    const [registryPda] = await findRegistryPda({ seed: REGISTRY_SEED });

    // Find the reverse record PDA
    const [reverseRecordPda] = await findReverseRecordPda({
      registry: registryPda,
      owner: ownerAddress,
    });

    // Fetch the reverse record
    const reverseRecord = await fetchMaybeReverseRecord(rpc, reverseRecordPda);

    if (!reverseRecord.exists) {
      return;
    }

    // Fetch the name record
    const nameRecord = await fetchMaybeNameRecord(
      rpc,
      reverseRecord.data.nameRecord,
    );

    if (!nameRecord.exists) {
      return;
    }

    // Decode the name from the byte array
    // The name is stored as UTF-8 bytes, find the undefined terminator
    const nameBytes = nameRecord.data.name;
    const nullIndex = nameBytes.indexOf(0);
    const validNameBytes =
      nullIndex === -1 ? nameBytes : nameBytes.slice(0, nullIndex);

    // Convert to string
    const nameString = new TextDecoder().decode(new Uint8Array(validNameBytes));

    return nameString;
  }, [owner, rpc]);

  return useData<string | undefined>(key, fetchName, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
};
