import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";

const purchaseSchema = z.object({
  membershipProductId: z.string().uuid(),
  transactionSignature: z.string().optional(),
});

/**
 * POST /api/public/memberships/purchase
 *
 * Record a membership purchase after the user has paid.
 * For Fogo testnet, this is a simple database record.
 * The transaction signature can be verified on-chain if needed.
 */
export const POST = async (request: NextRequest) => {
  // Get wallet address from auth header (set by proxy)
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = purchaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { membershipProductId, transactionSignature } = parsed.data;

    // Get the membership product
    const membership = await prisma.membershipProduct.findUnique({
      where: { id: membershipProductId },
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

    // Check if already purchased
    const existingPurchase = await prisma.membershipPurchase.findUnique({
      where: {
        membershipProductId_walletAddress: {
          membershipProductId,
          walletAddress,
        },
      },
    });

    if (existingPurchase) {
      return NextResponse.json({
        success: true,
        message: "Already purchased",
        purchase: existingPurchase,
      });
    }

    // For paid memberships, require transaction signature
    const isPaid = membership.priceAmount && membership.priceAmount !== "0";
    if (isPaid && !transactionSignature) {
      return NextResponse.json(
        { error: "Transaction signature required for paid membership" },
        { status: 400 },
      );
    }

    // Create purchase record
    const purchase = await prisma.membershipPurchase.create({
      data: {
        membershipProductId,
        walletAddress,
        transactionSignature: transactionSignature ?? null,
        amountPaid: membership.priceAmount,
        tokenMint: membership.priceToken,
        status: "completed",
      },
    });

    // Invalidate access cache for this wallet
    await prisma.accessCheck.deleteMany({
      where: { walletAddress },
    });

    return NextResponse.json({
      success: true,
      purchase,
      membership: {
        id: membership.id,
        name: membership.name,
        creatorUsername: membership.creator.username,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process purchase" },
      { status: 500 },
    );
  }
};

/**
 * GET /api/public/memberships/purchase
 *
 * Check if the current user has purchased a membership
 */
export const GET = async (request: NextRequest) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const membershipProductId = searchParams.get("membershipProductId");

  if (!membershipProductId) {
    return NextResponse.json(
      { error: "membershipProductId is required" },
      { status: 400 },
    );
  }

  try {
    const purchase = await prisma.membershipPurchase.findUnique({
      where: {
        membershipProductId_walletAddress: {
          membershipProductId,
          walletAddress,
        },
      },
    });

    return NextResponse.json({
      hasPurchased: !!purchase,
      purchase,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to check purchase" },
      { status: 500 },
    );
  }
};

