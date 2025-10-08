import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { useCallback } from 'react';
import { z } from 'zod';

import { getMetadata } from '../utils/get-metadata';
import type { EstablishedSessionState } from '../session-provider';
import { useData } from '../utils/use-data';
import { useMobileConnection } from '../wallet-connect/wallet-provider';

export { TokenDataStateType } from '../utils/use-data';

/**
 * Hook to fetch and manage token account data for an established session.
 *
 * This hook retrieves SPL token account information including balances,
 * metadata, and other token-related data for the connected wallet.
 * It automatically caches and refreshes data as needed.
 *
 * @example
 * ```tsx
 * import { useTokenAccountData, useSession, StateType } from '@leapwallet/sessions-sdk-react-native';
 *
 * function TokenList() {
 *   const sessionState = useSession();
 *
 *   if (sessionState.type === StateType.Established) {
 *     const { data, loading, error } = useTokenAccountData(sessionState);
 *
 *     if (loading) return <Text>Loading tokens...</Text>;
 *     if (error) return <Text>Error loading tokens</Text>;
 *
 *     return (
 *       <View>
 *         {data?.map(token => (
 *           <Text key={token.mint}>{token.symbol}: {token.balance}</Text>
 *         ))}
 *       </View>
 *     );
 *   }
 *
 *   return <Text>No session established</Text>;
 * }
 * ```
 *
 * @param sessionState - The established session state containing wallet information
 * @returns Object containing token data, loading state, and error information
 *
 * @category React Hooks
 * @public
 */
export const useTokenAccountData = (sessionState: EstablishedSessionState) => {
  const { connection } = useMobileConnection();

  const getTokenAccountData = useCallback(
    () => getTokenAccounts(connection, sessionState),
    [connection, sessionState]
  );

  return useData(
    getCacheKey(sessionState.walletPublicKey),
    getTokenAccountData,
    {}
  );
};

export const getCacheKey = (walletPublicKey: PublicKey) => [
  'tokenAccountData',
  walletPublicKey.toBase58(),
];

export type Token = Awaited<
  ReturnType<typeof getTokenAccounts>
>['tokensInWallet'][number];

const getTokenAccounts = async (
  connection: Connection,
  sessionState: EstablishedSessionState
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
    })
  );

  const metadata = await getMetadata(accounts.map((account) => account.mint));

  return {
    tokensInWallet: accounts
      .filter(({ amountInWallet }) => amountInWallet !== 0n)
      .map(({ mint, amountInWallet, decimals }) => ({
        mint: new PublicKey(mint),
        amountInWallet,
        decimals,
        ...metadata[mint],
      })),
    sessionLimits: accounts
      .filter(
        ({ delegate, delegateAmount }) =>
          delegate === sessionState.sessionPublicKey.toBase58() &&
          delegateAmount !== 0n
      )
      .map(({ mint, delegateAmount, decimals }) =>
        delegateAmount === undefined
          ? undefined
          : {
              mint: new PublicKey(mint),
              sessionLimit: delegateAmount,
              decimals,
              ...metadata[mint],
            }
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
    })
);
