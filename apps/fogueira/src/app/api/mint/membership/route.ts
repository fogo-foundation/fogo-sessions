import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import {
  getCandyMachineInfo,
  buildMintTransaction,
} from "../../../../lib/candy-machine";

const mintRequestSchema = z.object({
  membershipId: z.string().uuid(),
  candyMachineAddress: z.string().min(32).max(44),
});

/**
 * GET /api/mint/membership
 *
 * Get Candy Machine information for a membership
 */
export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get("membershipId");

    if (!membershipId) {
      return NextResponse.json(
        { error: "membershipId is required" },
        { status: 400 },
      );
    }

    const membership = await prisma.membershipProduct.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 },
      );
    }

    if (!membership.candyMachineAddress) {
      return NextResponse.json(
        { error: "Candy Machine not configured for this membership" },
        { status: 400 },
      );
    }

    const info = await getCandyMachineInfo(membership.candyMachineAddress);

    if (!info) {
      return NextResponse.json(
        { error: "Failed to fetch Candy Machine information" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      membership: {
        id: membership.id,
        name: membership.name,
        description: membership.description,
      },
      candyMachine: info,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch mint information" },
      { status: 500 },
    );
  }
};

/**
 * POST /api/mint/membership
 *
 * Build a mint transaction for the client to sign
 */
export const POST = async (request: NextRequest) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = mintRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { membershipId, candyMachineAddress } = parsed.data;

    // Verify membership exists and matches candy machine
    const membership = await prisma.membershipProduct.findUnique({
      where: { id: membershipId },
      include: {
        creator: {
          select: { username: true },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 },
      );
    }

    if (membership.candyMachineAddress !== candyMachineAddress) {
      return NextResponse.json(
        { error: "Invalid Candy Machine address" },
        { status: 400 },
      );
    }

    // Build the mint transaction
    const result = await buildMintTransaction(candyMachineAddress, walletAddress);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      transaction: result.transaction,
      nftMint: result.nftMint,
      membership: {
        id: membership.id,
        name: membership.name,
        creator: membership.creator.username,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to build mint transaction" },
      { status: 500 },
    );
  }
};
