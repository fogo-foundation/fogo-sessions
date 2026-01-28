import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

const updateMembershipProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens").optional(),
  description: z.string().max(1000).optional(),
  benefits: z.array(z.string()).optional(),
  imageBlobKey: z.string().optional(),
  nftCollectionMint: z.string().optional(),
  mintAddress: z.string().optional(),
  priceToken: z.string().optional(),
  priceAmount: z.string().optional(),
  treasuryAddress: z.string().optional(),
  saleMode: z.enum(["candy_machine", "direct"]).optional(),
  candyMachineAddress: z.string().optional(),
});

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json(
      { error: "Unauthorized. Wallet address required." },
      { status: 401 }
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
        { status: 404 }
      );
    }

    const product = await prisma.membershipProduct.findFirst({
      where: {
        id,
        creatorId: user.creator.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Membership product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching membership product:", error);
    return NextResponse.json(
      { error: "Failed to fetch membership product" },
      { status: 500 }
    );
  }
};

export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json(
      { error: "Unauthorized. Wallet address required." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateMembershipProductSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: { creator: true },
    });

    if (!user?.creator) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    // Verify product belongs to creator
    const existingProduct = await prisma.membershipProduct.findFirst({
      where: {
        id,
        creatorId: user.creator.id,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Membership product not found" },
        { status: 404 }
      );
    }

    // Check slug uniqueness if slug is being updated
    if (data.slug && data.slug !== existingProduct.slug) {
      const slugTaken = await prisma.membershipProduct.findUnique({
        where: {
          creatorId_slug: {
            creatorId: user.creator.id,
            slug: data.slug,
          },
        },
      });

      if (slugTaken) {
        return NextResponse.json(
          { error: "A product with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data, converting undefined to null for optional fields
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.benefits !== undefined) {
      // Filter out empty strings and ensure it's a clean array
      updateData.benefits = (data.benefits ?? []).filter((b) => b.trim() !== "");
    }
    if (data.imageBlobKey !== undefined) updateData.imageBlobKey = data.imageBlobKey ?? null;
    if (data.nftCollectionMint !== undefined) updateData.nftCollectionMint = data.nftCollectionMint ?? null;
    if (data.mintAddress !== undefined) updateData.mintAddress = data.mintAddress ?? null;
    if (data.priceToken !== undefined) updateData.priceToken = data.priceToken ?? null;
    if (data.priceAmount !== undefined) updateData.priceAmount = data.priceAmount ?? null;
    if (data.treasuryAddress !== undefined) updateData.treasuryAddress = data.treasuryAddress ?? null;
    if (data.saleMode !== undefined) updateData.saleMode = data.saleMode;
    if (data.candyMachineAddress !== undefined) updateData.candyMachineAddress = data.candyMachineAddress ?? null;

    const product = await prisma.membershipProduct.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating membership product:", error);
    return NextResponse.json(
      { error: "Failed to update membership product" },
      { status: 500 }
    );
  }
};

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json(
      { error: "Unauthorized. Wallet address required." },
      { status: 401 }
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
        { status: 404 }
      );
    }

    // Verify product belongs to creator
    const existingProduct = await prisma.membershipProduct.findFirst({
      where: {
        id,
        creatorId: user.creator.id,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Membership product not found" },
        { status: 404 }
      );
    }

    await prisma.membershipProduct.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting membership product:", error);
    return NextResponse.json(
      { error: "Failed to delete membership product" },
      { status: 500 }
    );
  }
};

