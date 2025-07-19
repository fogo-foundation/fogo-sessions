import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useCallback } from "react";
import { z } from "zod";

import type { EstablishedSessionState } from "./session-provider.js";
import { useData } from "./use-data.js";

export { StateType } from "./use-data.js";

export const useTokenAccountData = (sessionState: EstablishedSessionState) => {
  const { connection } = useConnection();

  const getTokenAccountData = useCallback(
    () => getTokenAccounts(connection, sessionState),
    [connection, sessionState],
  );

  return useData(
    getCacheKey(sessionState.walletPublicKey),
    getTokenAccountData,
    {},
  );
};

export const getCacheKey = (walletPublicKey: PublicKey) => [
  "tokenAccountData",
  walletPublicKey.toBase58(),
];

const getTokenAccounts = async (
  connection: Connection,
  sessionState: EstablishedSessionState,
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

  return {
    tokensInWallet: accounts
      .filter(({ amountInWallet }) => amountInWallet !== 0n)
      .map(({ mint, amountInWallet, decimals }) => ({
        mint: new PublicKey(mint),
        amountInWallet,
        decimals,
      })),
    sessionLimits: accounts
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
            },
      )
      .filter((account) => account !== undefined),
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
