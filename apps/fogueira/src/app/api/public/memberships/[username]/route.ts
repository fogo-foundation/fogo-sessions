import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) => {
  try {
    const { username } = await params;

    const creator = await prisma.creator.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarBlobKey: true,
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 },
      );
    }

    const memberships = await prisma.membershipProduct.findMany({
      where: { creatorId: creator.id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        benefits: true,
        imageBlobKey: true,
        priceToken: true,
        priceAmount: true,
        candyMachineAddress: true,
        nftCollectionMint: true,
        saleMode: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      creator,
      memberships,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch memberships" },
      { status: 500 },
    );
  }
};

