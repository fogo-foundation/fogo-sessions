import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

type GatingExpression = {
  type: string;
  membershipProductId?: string;
  conditions?: GatingExpression[];
};

/**
 * Extract all membership product IDs from a gating expression
 */
function extractMembershipProductIds(expression: GatingExpression | null): string[] {
  if (!expression) return [];

  const ids: string[] = [];

  if (expression.type === "membership" && expression.membershipProductId) {
    ids.push(expression.membershipProductId);
  }

  if (expression.conditions) {
    for (const condition of expression.conditions) {
      ids.push(...extractMembershipProductIds(condition));
    }
  }

  return ids;
}

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

    // Collect unique gating rule IDs from widgets
    const widgetGatingRuleIds = new Set<string>();
    for (const widget of publishedRevision.widgets) {
      if (widget.gatingRuleId) {
        widgetGatingRuleIds.add(widget.gatingRuleId);
      }
    }

    // Fetch gating rules for widgets
    const widgetGatingRules = widgetGatingRuleIds.size > 0
      ? await prisma.gatingRule.findMany({
          where: { id: { in: Array.from(widgetGatingRuleIds) } },
          select: { id: true, name: true, previewMode: true, expression: true },
        })
      : [];

    const gatingRulesMap = new Map(widgetGatingRules.map(r => [r.id, r]));

    // Extract membership product IDs from all gating rules
    const membershipProductIds = new Set<string>();
    
    if (page.gatingRule?.expression) {
      const ids = extractMembershipProductIds(page.gatingRule.expression as GatingExpression);
      for (const id of ids) membershipProductIds.add(id);
    }
    
    for (const rule of widgetGatingRules) {
      if (rule.expression) {
        const ids = extractMembershipProductIds(rule.expression as GatingExpression);
        for (const id of ids) membershipProductIds.add(id);
      }
    }

    // Fetch membership products for buy buttons
    const membershipProducts = membershipProductIds.size > 0
      ? await prisma.membershipProduct.findMany({
          where: { id: { in: Array.from(membershipProductIds) } },
          select: {
            id: true,
            name: true,
            slug: true,
            priceAmount: true,
            priceToken: true,
            creator: {
              select: { username: true },
            },
          },
        })
      : [];

    const membershipProductsMap = new Map(membershipProducts.map(m => [m.id, m]));

    // Build gating rule response with membership info
    type GatingRuleInput = {
      id: string;
      name: string;
      previewMode: string | null;
      expression?: unknown;
    };

    const buildGatingRuleResponse = (rule: GatingRuleInput | null) => {
      if (!rule) return null;
      
      const membershipIds = extractMembershipProductIds(rule.expression as GatingExpression | null);
      const firstMembershipId = membershipIds[0];
      const membership = firstMembershipId
        ? membershipProductsMap.get(firstMembershipId)
        : null;

      return {
        id: rule.id,
        name: rule.name,
        previewMode: rule.previewMode,
        membership: membership
          ? {
              id: membership.id,
              name: membership.name,
              slug: membership.slug,
              priceAmount: membership.priceAmount,
              priceToken: membership.priceToken,
              creatorUsername: membership.creator.username,
            }
          : null,
      };
    };

    return NextResponse.json({
      creator,
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        isHome: page.isHome,
        bgImage: page.bgImage,
        bgColor: page.bgColor,
        overlayColor: page.overlayColor,
        fullWidth: page.fullWidth,
        gatingRule: buildGatingRuleResponse(page.gatingRule),
        widgets: publishedRevision.widgets.map((w) => {
          const widgetRule = w.gatingRuleId ? gatingRulesMap.get(w.gatingRuleId) : null;
          return {
            ...w,
            gatingRule: widgetRule ? buildGatingRuleResponse(widgetRule) : null,
          };
        }),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch page" },
      { status: 500 },
    );
  }
};

