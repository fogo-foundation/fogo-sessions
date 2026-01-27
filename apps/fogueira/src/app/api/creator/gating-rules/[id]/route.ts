import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";

const gatingRuleExpressionSchema = z.object({
  type: z.enum(["and", "or", "token_holding"]),
  tokenMint: z.string().optional(),
  minAmount: z.string().optional(),
  conditions: z.array(z.any()).optional(),
});

const updateGatingRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  expression: gatingRuleExpressionSchema.optional(),
});

export const GET = async (
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

    const rule = await prisma.gatingRule.findFirst({
      where: {
        id,
        creatorId: user.creator.id,
      },
    });

    if (!rule) {
      return NextResponse.json(
        { error: "Gating rule not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Error fetching gating rule:", error);
    return NextResponse.json(
      { error: "Failed to fetch gating rule" },
      { status: 500 },
    );
  }
};

export const PUT = async (
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
    const body = await request.json();
    const data = updateGatingRuleSchema.parse(body);

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

    const existingRule = await prisma.gatingRule.findFirst({
      where: {
        id,
        creatorId: user.creator.id,
      },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Gating rule not found" },
        { status: 404 },
      );
    }

    const rule = await prisma.gatingRule.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.expression && { expression: data.expression as object }),
      },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error updating gating rule:", error);
    return NextResponse.json(
      { error: "Failed to update gating rule" },
      { status: 500 },
    );
  }
};

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

    const existingRule = await prisma.gatingRule.findFirst({
      where: {
        id,
        creatorId: user.creator.id,
      },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Gating rule not found" },
        { status: 404 },
      );
    }

    await prisma.gatingRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting gating rule:", error);
    return NextResponse.json(
      { error: "Failed to delete gating rule" },
      { status: 500 },
    );
  }
};
