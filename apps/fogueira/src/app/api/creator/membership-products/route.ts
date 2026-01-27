import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";

const membershipProductSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  description: z.string().max(1000).optional(),
  imageBlobKey: z.string().optional(),
  nftCollectionMint: z.string().optional(),
  mintAddress: z.string().optional(),
  priceToken: z.string().optional(),
  priceAmount: z.string().optional(),
  treasuryAddress: z.string().optional(),
  saleMode: z.enum(["candy_machine", "direct"]).default("candy_machine"),
  candyMachineAddress: z.string().optional(),
});

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

    const products = await prisma.membershipProduct.findMany({
      where: { creatorId: user.creator.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching membership products:", error);
    return NextResponse.json(
      { error: "Failed to fetch membership products" },
      { status: 500 },
    );
  }
};

export const POST = async (request: NextRequest) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json(
      { error: "Unauthorized. Wallet address required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const data = membershipProductSchema.parse(body);

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

    // Check slug uniqueness for this creator
    const existingProduct = await prisma.membershipProduct.findUnique({
      where: {
        creatorId_slug: {
          creatorId: user.creator.id,
          slug: data.slug,
        },
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this slug already exists" },
        { status: 400 },
      );
    }

    const product = await prisma.membershipProduct.create({
      data: {
        creatorId: user.creator.id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        imageBlobKey: data.imageBlobKey ?? null,
        nftCollectionMint: data.nftCollectionMint ?? null,
        mintAddress: data.mintAddress ?? null,
        priceToken: data.priceToken ?? null,
        priceAmount: data.priceAmount ?? null,
        treasuryAddress: data.treasuryAddress ?? null,
        saleMode: data.saleMode,
        candyMachineAddress: data.candyMachineAddress ?? null,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating membership product:", error);
    return NextResponse.json(
      { error: "Failed to create membership product" },
      { status: 500 },
    );
  }
};
