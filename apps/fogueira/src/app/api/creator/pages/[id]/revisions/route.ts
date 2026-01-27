import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../lib/prisma";

const widgetSchema = z.object({
  id: z.string().optional(),
  widgetType: z.string(),
  config: z.record(z.unknown()),
  orderIndex: z.number(),
  gatingRuleId: z.string().uuid().optional().nullable(),
});

const revisionUpdateSchema = z.object({
  widgets: z.array(widgetSchema),
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
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 },
      );
    }

    // Get draft revision or create one
    let revision = await prisma.pageRevision.findFirst({
      where: {
        pageId: id,
        status: "draft",
      },
      include: {
        widgets: {
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!revision) {
      revision = await prisma.pageRevision.create({
        data: {
          pageId: id,
          status: "draft",
        },
        include: {
          widgets: {
            orderBy: { orderIndex: "asc" },
          },
        },
      });
    }

    return NextResponse.json({ revision });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch revision" },
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
    const data = revisionUpdateSchema.parse(body);

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

    // Get or create draft revision
    let revision = await prisma.pageRevision.findFirst({
      where: {
        pageId: id,
        status: "draft",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!revision) {
      revision = await prisma.pageRevision.create({
        data: {
          pageId: id,
          status: "draft",
        },
      });
    }

    // Delete existing widgets
    await prisma.widgetInstance.deleteMany({
      where: { revisionId: revision.id },
    });

    // Create new widgets
    await Promise.all(
      data.widgets.map((widget) =>
        prisma.widgetInstance.create({
          data: {
            revisionId: revision.id,
            widgetType: widget.widgetType,
            config: widget.config as object,
            orderIndex: widget.orderIndex,
            gatingRuleId: widget.gatingRuleId ?? null,
          },
        }),
      ),
    );

    const updatedRevision = await prisma.pageRevision.findUnique({
      where: { id: revision.id },
      include: {
        widgets: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json({ revision: updatedRevision });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update revision" },
      { status: 500 },
    );
  }
};

