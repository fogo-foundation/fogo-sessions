import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) => {
  try {
    const { username } = await params;
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");

    const creator = await prisma.creator.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarBlobKey: true,
        bannerBlobKey: true,
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 },
      );
    }

    // Find the page - either by slug or home page
    const page = await prisma.page.findFirst({
      where: {
        creatorId: creator.id,
        ...(slug ? { slug } : { isHome: true }),
      },
      include: {
        revisions: {
          where: { status: "published" },
          include: {
            widgets: {
              orderBy: { orderIndex: "asc" },
            },
          },
          orderBy: { publishedAt: "desc" },
          take: 1,
        },
        gatingRule: true,
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 },
      );
    }

    const publishedRevision = page.revisions[0];

    if (!publishedRevision) {
      return NextResponse.json(
        { error: "Page not published" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      creator,
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        isHome: page.isHome,
        gatingRule: page.gatingRule,
        widgets: publishedRevision.widgets,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch page" },
      { status: 500 },
    );
  }
};

