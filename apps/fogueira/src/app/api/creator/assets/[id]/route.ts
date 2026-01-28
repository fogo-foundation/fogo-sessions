import { del as deleteBlob } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

/**
 * DELETE /api/creator/assets/[id]
 * Delete an asset
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json(
      { error: "Unauthorized. Wallet address required." },
      { status: 401 },
    );
  }

  try {
    const { id } = await params;
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

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        creatorId: user.creator.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Delete from blob storage
    try {
      await deleteBlob(asset.blobKey);
    } catch (blobError) {
      // Log but continue with database deletion
      console.error("Failed to delete blob:", blobError);
    }

    // Delete from database
    await prisma.asset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting asset:", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 },
    );
  }
};
