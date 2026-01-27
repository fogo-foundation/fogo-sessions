import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export const POST = async (
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

    // Get draft revision
    const draftRevision = await prisma.pageRevision.findFirst({
      where: {
        pageId: id,
        status: "draft",
      },
      include: {
        widgets: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!draftRevision) {
      return NextResponse.json(
        { error: "No draft revision found" },
        { status: 400 },
      );
    }

    // Unpublish existing published revisions
    await prisma.pageRevision.updateMany({
      where: {
        pageId: id,
        status: "published",
      },
      data: {
        status: "draft",
        publishedAt: null,
      },
    });

    // Publish the draft revision
    const publishedRevision = await prisma.pageRevision.update({
      where: { id: draftRevision.id },
      data: {
        status: "published",
        publishedAt: new Date(),
      },
      include: {
        widgets: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json({ revision: publishedRevision });
  } catch {
    return NextResponse.json(
      { error: "Failed to publish page" },
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

    // Unpublish all published revisions
    await prisma.pageRevision.updateMany({
      where: {
        pageId: id,
        status: "published",
      },
      data: {
        status: "draft",
        publishedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to unpublish page" },
      { status: 500 },
    );
  }
};

