import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

/**
 * GET /api/creator/assets
 *
 * List all assets for the authenticated creator.
 */
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("x-authenticated-user");

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      select: {
        id: true,
        blobKey: true,
        mimeType: true,
        filename: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      assets: assets.map((asset) => ({
        id: asset.id,
        url: asset.blobKey,
        mimeType: asset.mimeType,
        filename: asset.filename,
        sizeBytes: asset.sizeBytes,
        createdAt: asset.createdAt,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 },
    );
  }
}

