import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ username: string; slug: string }> },
) => {
  try {
    const { username, slug } = await params;

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

    const membership = await prisma.membershipProduct.findFirst({
      where: {
        creatorId: creator.id,
        slug,
      },
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
        treasuryAddress: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      creator,
      membership,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch membership" },
      { status: 500 },
    );
  }
};

