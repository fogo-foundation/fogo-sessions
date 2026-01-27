import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { connection } from "../../../../../fogo-connection";
import { buildTokenTransferTransaction } from "../../../../../lib/token-transfer";
import { prisma } from "../../../../../lib/prisma";

const buildTransferSchema = z.object({
  membershipProductId: z.string().uuid(),
});

/**
 * POST /api/public/memberships/build-transfer
 *
 * Build a token transfer transaction for purchasing a membership
 */
export const POST = async (request: NextRequest) => {
  // Get wallet address from auth header (set by proxy)
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = buildTransferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { membershipProductId } = parsed.data;

    // Get the membership product
    const membership = await prisma.membershipProduct.findUnique({
      where: { id: membershipProductId },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 },
      );
    }

    if (!membership.priceToken || !membership.priceAmount || !membership.treasuryAddress) {
      return NextResponse.json(
        { error: "Membership payment not configured" },
        { status: 400 },
      );
    }

    // Validate public keys
    let fromWallet: PublicKey;
    let toWallet: PublicKey;
    let tokenMint: PublicKey;

    try {
      fromWallet = new PublicKey(walletAddress);
    } catch {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 },
      );
    }

    try {
      toWallet = new PublicKey(membership.treasuryAddress);
    } catch {
      return NextResponse.json(
        { error: `Invalid treasury address: ${membership.treasuryAddress}` },
        { status: 400 },
      );
    }

    try {
      tokenMint = new PublicKey(membership.priceToken);
    } catch {
      return NextResponse.json(
        { error: `Invalid token mint: ${membership.priceToken}` },
        { status: 400 },
      );
    }

    const amount = BigInt(membership.priceAmount);

    const transaction = await buildTokenTransferTransaction(
      connection,
      fromWallet,
      toWallet,
      tokenMint,
      amount,
    );

    // Serialize instructions for the client to sign and send
    const instructions = transaction.instructions.map((ix, ixIdx) => {
      const programIdStr = ix.programId.toBase58();
      const keysArr = ix.keys.map((key, keyIdx) => {
        const pubkeyStr = key.pubkey.toBase58();
        
        // Validate pubkey
        if (pubkeyStr.length < 32 || pubkeyStr.length > 44) {
          throw new Error(`Invalid pubkey at instruction ${ixIdx}, key ${keyIdx}: "${pubkeyStr}" (length: ${pubkeyStr.length})`);
        }
        
        return {
          pubkey: pubkeyStr,
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        };
      });

      // Validate programId
      if (programIdStr.length < 32 || programIdStr.length > 44) {
        throw new Error(`Invalid programId at instruction ${ixIdx}: "${programIdStr}" (length: ${programIdStr.length})`);
      }

      // Convert data to base64 - handle both Buffer and Uint8Array
      const dataBase64 = Buffer.from(ix.data).toString("base64");

      return {
        programId: programIdStr,
        keys: keysArr,
        data: dataBase64,
      };
    });

    return NextResponse.json({
      instructions,
      amount: membership.priceAmount,
      token: membership.priceToken,
    });
  } catch (error) {
    console.error("Error building transfer transaction:", error);
    return NextResponse.json(
      { error: "Failed to build transaction" },
      { status: 500 },
    );
  }
};

