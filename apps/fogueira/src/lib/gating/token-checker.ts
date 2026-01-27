import { Connection, PublicKey } from "@solana/web3.js";

/**
 * Token balance information
 */
export type TokenBalance = {
  mint: string;
  amount: string;
  decimals: number;
};

/**
 * NFT holding information
 */
export type NftHolding = {
  mint: string;
  collectionMint: string | null;
  name: string;
};

/**
 * Check token holdings for a wallet using Solana RPC
 */
export class TokenChecker {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  /**
   * Get all SPL token balances for a wallet
   */
  async getTokenBalances(walletAddress: string): Promise<TokenBalance[]> {
    try {
      const pubkey = new PublicKey(walletAddress);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        pubkey,
        {
          programId: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          ),
        },
      );

      return tokenAccounts.value
        .map((account) => {
          const info = account.account.data.parsed?.info;
          if (!info) return null;

          return {
            mint: info.mint as string,
            amount: info.tokenAmount?.amount as string,
            decimals: info.tokenAmount?.decimals as number,
          };
        })
        .filter((b): b is TokenBalance => b !== null && b.amount !== "0");
    } catch {
      return [];
    }
  }

  /**
   * Check if wallet holds a specific token with minimum amount
   */
  async hasTokenBalance(
    walletAddress: string,
    mintAddress: string,
    minAmount: string,
  ): Promise<{ hasBalance: boolean; actualAmount: string }> {
    const balances = await this.getTokenBalances(walletAddress);
    const tokenBalance = balances.find((b) => b.mint === mintAddress);

    if (!tokenBalance) {
      return { hasBalance: false, actualAmount: "0" };
    }

    const actual = BigInt(tokenBalance.amount);
    const required = BigInt(minAmount);

    return {
      hasBalance: actual >= required,
      actualAmount: tokenBalance.amount,
    };
  }

  /**
   * Get NFT holdings with collection info using DAS API (Helius/Triton)
   * Falls back to basic token account check if DAS not available
   */
  async getNftHoldings(walletAddress: string): Promise<NftHolding[]> {
    try {
      // Try DAS API first (works with Helius RPC)
      const response = await fetch(this.connection.rpcEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "get-assets",
          method: "getAssetsByOwner",
          params: {
            ownerAddress: walletAddress,
            page: 1,
            limit: 1000,
          },
        }),
      });

      const data = await response.json();

      if (data.result?.items) {
        return data.result.items
          .filter(
            (item: { interface?: string }) =>
              item.interface === "V1_NFT" ||
              item.interface === "ProgrammableNFT",
          )
          .map(
            (item: {
              id: string;
              grouping?: { group_key: string; group_value: string }[];
              content?: { metadata?: { name?: string } };
            }) => ({
              mint: item.id,
              collectionMint:
                item.grouping?.find((g) => g.group_key === "collection")
                  ?.group_value || null,
              name: item.content?.metadata?.name || "Unknown NFT",
            }),
          );
      }
    } catch {
      // DAS API not available, fall back to basic check
    }

    // Fallback: return empty (can't determine collections without DAS)
    return [];
  }

  /**
   * Check if wallet holds NFT from a specific collection
   */
  async hasNftFromCollection(
    walletAddress: string,
    collectionMint: string,
    minCount = 1,
  ): Promise<{ hasNft: boolean; count: number }> {
    const nfts = await this.getNftHoldings(walletAddress);
    const matchingNfts = nfts.filter(
      (nft) => nft.collectionMint === collectionMint,
    );

    return {
      hasNft: matchingNfts.length >= minCount,
      count: matchingNfts.length,
    };
  }
}

/**
 * Create a TokenChecker instance with the configured RPC URL
 */
export function createTokenChecker(rpcUrl?: string): TokenChecker {
  const url =
    rpcUrl ||
    process.env.SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com";
  return new TokenChecker(url);
}

