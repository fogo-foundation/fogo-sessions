import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

/**
 * GET /api/creator/assets
 * List all assets for the authenticated creator
 */
export const GET = async (request: NextRequest) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json(
      { error: "Unauthorized. Wallet address required." },
      { status: 401 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: { creator: true },
    });

    if (!user?.creator) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 },
      );
    }

    const assets = await prisma.asset.findMany({
      where: { creatorId: user.creator.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assets });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 },
    );
  }
};
