import type { Network } from "@fogo/sessions-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { useCallback } from "react";
import { z } from "zod";

import { getMetadata } from "../get-metadata.js";
import type { WalletConnectedSessionState } from "../session-state.js";
import { isEstablished } from "../session-state.js";
import { useData } from "./use-data.js";
import { useConnection, useSessionContext } from "./use-session.js";

export { StateType } from "./use-data.js";

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
  const accounts = accountsSchema.parse(
    await connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        {
          dataSize: 165,
        },
        {
          memcmp: {
            offset: 32,
            bytes: sessionState.walletPublicKey.toBase58(),
          },
        },
      ],
    }),
  );

  const metadata = await getMetadata(
    accounts.map((account) => account.mint),
    network,
  );

  return {
    tokensInWallet: accounts
      .filter(({ amountInWallet }) => amountInWallet !== 0n)
      .map(({ mint, amountInWallet, decimals }) => ({
        mint: new PublicKey(mint),
        amountInWallet,
        decimals,
        ...metadata[mint],
      })),
    sessionLimits: isEstablished(sessionState)
      ? accounts
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
