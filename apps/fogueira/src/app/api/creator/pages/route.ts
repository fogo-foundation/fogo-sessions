import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";

const pageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  isHome: z.boolean().default(false),
  gatingRuleId: z.string().uuid().optional().nullable(),
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

    const pages = await prisma.page.findMany({
      where: { creatorId: user.creator.id },
      include: {
        revisions: {
          where: { status: "published" },
          orderBy: { publishedAt: "desc" },
          take: 1,
        },
        gatingRule: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isHome: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ pages });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch pages" },
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
    const data = pageSchema.parse(body);

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

    // Check if slug already exists
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

    // If setting as home page, unset any existing home page
    if (data.isHome) {
      await prisma.page.updateMany({
        where: {
          creatorId: user.creator.id,
          isHome: true,
        },
        data: {
          isHome: false,
        },
      });
    }

    // Create page with initial draft revision
    const page = await prisma.page.create({
      data: {
        creatorId: user.creator.id,
        title: data.title,
        slug: data.slug,
        isHome: data.isHome,
        gatingRuleId: data.gatingRuleId || null,
        revisions: {
          create: {
            status: "draft",
          },
        },
      },
      include: {
        revisions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create page" },
      { status: 500 },
    );
  }
};

