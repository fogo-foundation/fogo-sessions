import {
  establishSession,
  createSolanaWalletAdapter,
  SessionResultType,
} from "@fogo/sessions-sdk";
import { NATIVE_MINT } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useMemo, useCallback } from "react";

import type { Transaction } from "./use-transaction-log";
import { useAsync } from "../../hooks/use-async";
import { useWalletInfo } from "../../hooks/use-wallet-info";

export const useSession = (
  sponsor: string,
  addressLookupTableAddress: PublicKey | undefined,
  appendTransaction: (tx: Transaction) => void,
) => {
  const { connection } = useConnection();
  const getWalletInfo = useWalletInfo();
  const doEstablishSession = useCallback(async () => {
    const [walletInfo, addressLookupTable] = await Promise.all([
      getWalletInfo(),
      addressLookupTableAddress === undefined
        ? Promise.resolve(undefined)
        : connection.getAddressLookupTable(addressLookupTableAddress),
    ]);
    const result = await establishSession({
      adapter: createSolanaWalletAdapter({
        connection,
        publicKey: walletInfo.publicKey,
        signMessage: walletInfo.signMessage,
        paymasterUrl: "/api/sponsor_and_send",
        sponsor: new PublicKey(sponsor),
        addressLookupTables: addressLookupTable?.value
          ? [addressLookupTable.value]
          : undefined,
      }),
      expires: new Date(Date.now() + 3600 * 1000),
      tokens: new Map([[NATIVE_MINT, 100]]),
    });
    appendTransaction({
      description: "Create Session",
      signature: result.signature,
      success: result.type === SessionResultType.Success,
    });
    return result;
  }, [
    sponsor,
    connection,
    getWalletInfo,
    appendTransaction,
    addressLookupTableAddress,
  ]);
  const { execute, state } = useAsync(doEstablishSession);

  return useMemo(
    () => ({
      establishSession: execute,
      state,
    }),
    [state, execute],
  );
};
