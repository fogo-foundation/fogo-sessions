import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

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
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 },
      );
    }

    // Get all pages that have published revisions
    const pages = await prisma.page.findMany({
      where: {
        creatorId: creator.id,
      },
      include: {
        revisions: {
          where: { status: "published" },
          orderBy: { publishedAt: "desc" },
          take: 1,
        },
      },
      orderBy: [
        { isHome: "desc" },
        { createdAt: "asc" },
      ],
    });

    // Filter to only pages with published revisions
    const publishedPages = pages
      .filter((page) => page.revisions.length > 0)
      .map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        isHome: page.isHome,
      }));

    return NextResponse.json({ pages: publishedPages });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 },
    );
  }
};

