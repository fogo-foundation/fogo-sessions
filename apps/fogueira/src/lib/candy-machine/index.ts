import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  mplCandyMachine,
  fetchCandyMachine,
  mintV2,
  safeFetchCandyGuard,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  generateSigner,
  transactionBuilder,
  publicKey,
} from "@metaplex-foundation/umi";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

// Get RPC URL from environment
const getRpcUrl = () => {
  return (
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
  );
};

/**
 * Candy Machine information for display
 */
export type CandyMachineInfo = {
  address: string;
  itemsAvailable: number;
  itemsMinted: number;
  itemsRemaining: number;
  isSoldOut: boolean;
  price: string | null;
  priceToken: string | null;
};

/**
 * Result of a mint operation
 */
export type MintResult = {
  success: boolean;
  signature?: string;
  mintAddress?: string;
  error?: string;
};

/**
 * Fetch Candy Machine information
 */
export async function getCandyMachineInfo(
  candyMachineAddress: string,
): Promise<CandyMachineInfo | null> {
  try {
    const umi = createUmi(getRpcUrl()).use(mplCandyMachine());

    const candyMachinePublicKey = publicKey(candyMachineAddress);
    const candyMachine = await fetchCandyMachine(umi, candyMachinePublicKey);

    const itemsAvailable = Number(candyMachine.data.itemsAvailable);
    const itemsMinted = Number(candyMachine.itemsRedeemed);
    const itemsRemaining = itemsAvailable - itemsMinted;

    // Try to get price from candy guard
    let price: string | null = null;
    let priceToken: string | null = null;

    if (candyMachine.mintAuthority) {
      const candyGuard = await safeFetchCandyGuard(
        umi,
        candyMachine.mintAuthority,
      );

      if (candyGuard?.guards.solPayment.__option === "Some") {
        price = candyGuard.guards.solPayment.value.lamports.basisPoints.toString();
        priceToken = "SOL";
      } else if (candyGuard?.guards.tokenPayment.__option === "Some") {
        price = candyGuard.guards.tokenPayment.value.amount.toString();
        priceToken = candyGuard.guards.tokenPayment.value.mint.toString();
      }
    }

    return {
      address: candyMachineAddress,
      itemsAvailable,
      itemsMinted,
      itemsRemaining,
      isSoldOut: itemsRemaining <= 0,
      price,
      priceToken,
    };
  } catch (error) {
    console.error("Error fetching candy machine:", error);
    return null;
  }
}

/**
 * Build a mint transaction for the client to sign
 * Returns the serialized transaction that needs to be signed by the user's wallet
 */
export async function buildMintTransaction(
  candyMachineAddress: string,
  payerAddress: string,
): Promise<{ transaction: string; nftMint: string } | { error: string }> {
  try {
    const umi = createUmi(getRpcUrl())
      .use(mplCandyMachine())
      .use(mplTokenMetadata());

    const candyMachinePublicKey = publicKey(candyMachineAddress);
    const candyMachine = await fetchCandyMachine(umi, candyMachinePublicKey);

    // Check if items are available
    const itemsRemaining =
      Number(candyMachine.data.itemsAvailable) -
      Number(candyMachine.itemsRedeemed);

    if (itemsRemaining <= 0) {
      return { error: "Candy Machine is sold out" };
    }

    // Generate a new mint keypair for the NFT
    const nftMint = generateSigner(umi);

    // Fetch candy guard if exists
    let candyGuard = null;
    if (candyMachine.mintAuthority) {
      candyGuard = await safeFetchCandyGuard(umi, candyMachine.mintAuthority);
    }

    // Build the mint instruction
    const mintOptions: Parameters<typeof mintV2>[1] = {
      candyMachine: candyMachinePublicKey,
      nftMint,
      collectionMint: candyMachine.collectionMint,
      collectionUpdateAuthority: candyMachine.authority,
    };

    // Only add candyGuard if it exists
    if (candyGuard?.publicKey) {
      mintOptions.candyGuard = candyGuard.publicKey;
    }

    const mintIx = mintV2(umi, mintOptions);

    // Build transaction with compute budget
    const tx = transactionBuilder()
      .add(setComputeUnitLimit(umi, { units: 800_000 }))
      .add(mintIx);

    // Note: payerAddress will be set when the user signs the transaction
    void payerAddress; // Mark as intentionally unused for now

    // Build and serialize the transaction
    const builtTx = await tx.buildWithLatestBlockhash(umi);

    // Return the transaction as base64 for client signing
    const serializedTx = Buffer.from(
      umi.transactions.serialize(builtTx),
    ).toString("base64");

    return {
      transaction: serializedTx,
      nftMint: nftMint.publicKey.toString(),
    };
  } catch (error) {
    console.error("Error building mint transaction:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to build mint transaction",
    };
  }
}

/**
 * Verify a mint was successful by checking the NFT exists
 */
export async function verifyMint(
  mintAddress: string,
  _expectedOwner?: string,
): Promise<boolean> {
  try {
    const umi = createUmi(getRpcUrl()).use(mplTokenMetadata());

    // Check if the mint exists
    // In production, you would also verify ownership
    const mintPublicKey = publicKey(mintAddress);
    const account = await umi.rpc.getAccount(mintPublicKey);

    return account.exists;
  } catch {
    return false;
  }
}

