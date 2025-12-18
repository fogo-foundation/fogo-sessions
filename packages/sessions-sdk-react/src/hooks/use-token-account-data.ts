import type { Network } from "@fogo/sessions-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { type Connection, PublicKey } from "@solana/web3.js";
import { useCallback } from "react";
import { z } from "zod";

import { useData } from "../components/component-library/useData/index.js";
import { getMetadata } from "../get-metadata.js";
import type { WalletConnectedSessionState } from "../session-state.js";
import { isEstablished } from "../session-state.js";
import { useConnection, useSessionContext } from "./use-session.js";

export { StateType } from "../components/component-library/useData/index.js";

export const useTokenAccountData = (
  sessionState: WalletConnectedSessionState,
) => {
  const connection = useConnection();
  const { network } = useSessionContext();
  const getTokenAccountData = useCallback(
    () => getTokenAccounts(connection, sessionState, network),
    [connection, sessionState, network],
  );

  return useData(
    getCacheKey(network, sessionState.walletPublicKey),
    getTokenAccountData,
    {},
  );
};

export const getCacheKey = (network: Network, walletPublicKey: PublicKey) => [
  "tokenAccountData",
  network,
  walletPublicKey.toBase58(),
];

export type TokenAccountData = Awaited<ReturnType<typeof getTokenAccounts>>;

export type Token = Awaited<
  ReturnType<typeof getTokenAccounts>
>["tokensInWallet"][number];

const getTokenAccounts = async (
  connection: Connection,
  sessionState: WalletConnectedSessionState,
  network: Network,
) => {
  const [nativeBalance, unparsedSplAccounts] = await Promise.all([
    connection.getBalance(sessionState.walletPublicKey),
    connection.getParsedTokenAccountsByOwner(sessionState.walletPublicKey, {
      programId: TOKEN_PROGRAM_ID,
    }),
  ]);

  const splAccounts = accountsSchema.parse(unparsedSplAccounts.value);

  const metadata = await getMetadata(
    splAccounts.map((account) => account.mint),
    network,
  );

  return {
    nativeBalance: BigInt(nativeBalance),
    tokensInWallet: splAccounts
      .filter(({ amountInWallet }) => amountInWallet !== 0n)
      .map(({ mint, amountInWallet, decimals }) => ({
        mint: new PublicKey(mint),
        amountInWallet,
        decimals,
        ...metadata[mint],
      })),
    sessionLimits: isEstablished(sessionState)
      ? splAccounts
          .filter(
            ({ delegate, delegateAmount }) =>
              delegate === sessionState.sessionPublicKey.toBase58() &&
              delegateAmount !== 0n,
          )
          .map(({ mint, delegateAmount, decimals }) =>
            delegateAmount === undefined
              ? undefined
              : {
                  mint: new PublicKey(mint),
                  sessionLimit: delegateAmount,
                  decimals,
                  ...metadata[mint],
                },
          )
          .filter((account) => account !== undefined)
      : [],
  };
};

const accountsSchema = z.array(
  z
    .object({
      account: z.object({
        data: z.object({
          parsed: z.object({
            info: z.object({
              mint: z.string(),
              delegate: z.string().optional(),
              tokenAmount: z.object({
                amount: z.string(),
                decimals: z.number(),
              }),
              delegatedAmount: z
                .object({
                  amount: z.string(),
                  decimals: z.number(),
                })
                .optional(),
            }),
          }),
        }),
      }),
    })
    .transform(({ account }) => {
      const { info } = account.data.parsed;
      const { tokenAmount, delegatedAmount, mint, delegate } = info;
      return {
        mint,
        delegate,
        amountInWallet: BigInt(tokenAmount.amount),
        delegateAmount:
          delegatedAmount === undefined
            ? undefined
            : BigInt(delegatedAmount.amount),
        decimals: tokenAmount.decimals,
      };
    }),
);
