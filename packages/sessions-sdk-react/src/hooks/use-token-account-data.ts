import type { Network } from "@fogo/sessions-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { useCallback } from "react";
import { z } from "zod";

import { useData } from "../components/component-library/useData/index.js";
import { getMetadata } from "../get-metadata.js";
import type { WalletConnectedSessionState } from "../session-state.js";
import { isEstablished } from "../session-state.js";
import { useConnection, useSessionContext } from "./use-session.js";

export { StateType } from "../components/component-library/useData/index.js";

const FOGO_DECIMALS = 9;

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
                  decimals,
                  mint: new PublicKey(mint),
                  sessionLimit: delegateAmount,
                  ...metadata[mint],
                },
          )
          .filter((account) => account !== undefined)
      : [],
    tokensInWallet: [
      ...(nativeBalance === 0
        ? []
        : [
            {
              amountInWallet: BigInt(nativeBalance),
              decimals: FOGO_DECIMALS,
              image: "https://api.fogo.io/tokens/fogo.svg",
              isNative: true as const,
              name: "Fogo",
              symbol: "FOGO",
            },
          ]),
      ...splAccounts
        .filter(({ amountInWallet }) => amountInWallet !== 0n)
        .map(({ mint, amountInWallet, decimals }) => ({
          amountInWallet,
          decimals,
          isNative: false as const,
          mint: new PublicKey(mint),
          ...metadata[mint],
        }))
        .toSorted((a, b) => {
          if (a.name === undefined) {
            return b.name === undefined
              ? a.mint.toString().localeCompare(b.mint.toString())
              : 1;
          } else if (b.name === undefined) {
            return -1;
          } else {
            return a.name.toString().localeCompare(b.name.toString());
          }
        }),
    ],
  };
};

const accountsSchema = z.array(
  z
    .object({
      account: z.object({
        data: z.object({
          parsed: z.object({
            info: z.object({
              delegate: z.string().optional(),
              delegatedAmount: z
                .object({
                  amount: z.string(),
                  decimals: z.number(),
                })
                .optional(),
              mint: z.string(),
              tokenAmount: z.object({
                amount: z.string(),
                decimals: z.number(),
              }),
            }),
          }),
        }),
      }),
    })
    .transform(({ account }) => {
      const { info } = account.data.parsed;
      const { tokenAmount, delegatedAmount, mint, delegate } = info;
      return {
        amountInWallet: BigInt(tokenAmount.amount),
        decimals: tokenAmount.decimals,
        delegate,
        delegateAmount:
          delegatedAmount === undefined
            ? undefined
            : BigInt(delegatedAmount.amount),
        mint,
      };
    }),
);
