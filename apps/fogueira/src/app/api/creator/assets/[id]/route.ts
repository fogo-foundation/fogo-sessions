import { del } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

/**
 * DELETE /api/creator/assets/[id]
 *
 * Delete an asset from storage.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    // Find the asset and verify ownership
    const asset = await prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (asset.creatorId !== user.creator.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete from Vercel Blob
    try {
      await del(asset.blobKey);
    } catch {
      // Continue even if blob deletion fails
    }

    // Delete from database
    await prisma.asset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 },
    );
  }
}
