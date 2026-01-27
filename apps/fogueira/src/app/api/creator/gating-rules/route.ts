import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";

// Gating rule expression schema - supports various condition types
const gatingRuleExpressionSchema = z.object({
  type: z.enum(["and", "or", "token_holding", "token", "nft", "membership"]),
  // For token_holding / token
  tokenMint: z.string().optional(),
  mintAddress: z.string().optional(),
  minAmount: z.string().optional(),
  // For nft
  collectionMint: z.string().optional(),
  minCount: z.number().optional(),
  // For membership
  membershipProductId: z.string().optional(),
  // For and/or
  conditions: z.array(z.any()).optional(),
});

const gatingRuleSchema = z.object({
  name: z.string().min(1).max(100),
  expression: gatingRuleExpressionSchema,
  previewMode: z.string().nullable().optional(),
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

    const rules = await prisma.gatingRule.findMany({
      where: { creatorId: user.creator.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rules });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch gating rules" },
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
    const data = gatingRuleSchema.parse(body);

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

    const rule = await prisma.gatingRule.create({
      data: {
        creatorId: user.creator.id,
        name: data.name,
        expression: data.expression as object,
        previewMode: data.previewMode ?? null,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create gating rule" },
      { status: 500 },
    );
  }
};
