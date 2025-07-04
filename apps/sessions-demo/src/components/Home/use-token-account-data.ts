import type { Session } from "@fogo/sessions-sdk";
import {
  findMetadataPda,
  safeFetchMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as metaplexPublicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { useCallback } from "react";
import { z } from "zod";

import { useData } from "../../hooks/use-data";

export const useTokenAccountData = (session: Session) => {
  const { connection } = useConnection();
  const getTokenAccountData = useCallback(
    () => getTokenAccounts(connection, session),
    [connection, session],
  );
  return useData(
    ["tokenAccountData", session.walletPublicKey.toBase58()],
    getTokenAccountData,
  );
};

const getTokenAccounts = async (connection: Connection, session: Session) => {
  const accounts = accountsSchema.parse(
    await connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        {
          dataSize: 165,
        },
        {
          memcmp: {
            offset: 32,
            bytes: session.walletPublicKey.toBase58(),
          },
        },
      ],
    }),
  );
  const umi = createUmi(connection.rpcEndpoint);
  const accountsWithMetadata = await Promise.all(
    accounts.map(async (account) => {
      const metaplexMint = metaplexPublicKey(account.mint);
      const metadataAddress = findMetadataPda(umi, { mint: metaplexMint })[0];
      const metadata = await safeFetchMetadata(umi, metadataAddress);
      return { ...account, ...metadata };
    }),
  );
  return {
    tokensInWallet: accountsWithMetadata
      .filter((account) => account.amountInWallet !== "0")
      .map(({ name, mint, amountInWallet }) => ({
        nameOrMint: name ?? mint,
        mint,
        amountInWallet,
      })),
    sessionLimits: accountsWithMetadata
      .filter(
        (account) =>
          account.delegate === session.sessionPublicKey.toBase58() &&
          account.delegateAmount !== undefined &&
          account.delegateAmount !== "0",
      )
      .map(({ name, mint, delegateAmount }) => ({
        nameOrMint: name ?? mint,
        mint,
        sessionLimit: delegateAmount,
      })),
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
                uiAmountString: z.string(),
              }),
              delegatedAmount: z
                .object({
                  uiAmountString: z.string(),
                })
                .optional(),
            }),
          }),
        }),
      }),
    })
    .transform(({ account }) => ({
      mint: account.data.parsed.info.mint,
      delegate: account.data.parsed.info.delegate,
      amountInWallet: account.data.parsed.info.tokenAmount.uiAmountString,
      delegateAmount: account.data.parsed.info.delegatedAmount?.uiAmountString,
    })),
);
