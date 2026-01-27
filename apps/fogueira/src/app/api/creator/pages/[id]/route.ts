import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";

const pageUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    )
    .optional(),
  isHome: z.boolean().optional(),
  gatingRuleId: z.string().uuid().optional().nullable(),
  // Page appearance settings
  bgImage: z.string().url().optional().nullable(),
  bgColor: z.string().max(50).optional().nullable(),
  overlayColor: z.string().max(50).optional().nullable(),
  fullWidth: z.boolean().optional(),
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

    const page = await prisma.page.findFirst({
      where: {
        id,
        creatorId: user.creator.id,
      },
      include: {
        creator: {
          select: {
            username: true,
          },
        },
        revisions: {
          include: {
            widgets: {
              orderBy: { orderIndex: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        gatingRule: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ page });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch page" },
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
    const data = pageUpdateSchema.parse(body);

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

    const page = await prisma.page.findFirst({
      where: {
        id,
        creatorId: user.creator.id,
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 },
      );
    }

    // Check slug uniqueness if slug is being updated
    if (data.slug && data.slug !== page.slug) {
      const existingPage = await prisma.page.findUnique({
        where: {
          creatorId_slug: {
            creatorId: user.creator.id,
            slug: data.slug,
          },
        },
      });

      if (existingPage) {
        return NextResponse.json(
          { error: "A page with this slug already exists" },
          { status: 400 },
        );
      }
    }

    // If setting as home page, unset any existing home page
    if (data.isHome === true) {
      await prisma.page.updateMany({
        where: {
          creatorId: user.creator.id,
          isHome: true,
          id: { not: id },
        },
        data: {
          isHome: false,
        },
      });
    }

    // Build update data, only including fields that were provided
    const updateData: Record<string, string | boolean | null | undefined> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.isHome !== undefined) updateData.isHome = data.isHome;
    if (data.gatingRuleId !== undefined) updateData.gatingRuleId = data.gatingRuleId ?? null;
    if (data.bgImage !== undefined) updateData.bgImage = data.bgImage ?? null;
    if (data.bgColor !== undefined) updateData.bgColor = data.bgColor ?? null;
    if (data.overlayColor !== undefined) updateData.overlayColor = data.overlayColor ?? null;
    if (data.fullWidth !== undefined) updateData.fullWidth = data.fullWidth;

    const updatedPage = await prisma.page.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ page: updatedPage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update page" },
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

    const page = await prisma.page.findFirst({
      where: {
        id,
        creatorId: user.creator.id,
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 },
      );
    }

    await prisma.page.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 },
    );
  }
};

