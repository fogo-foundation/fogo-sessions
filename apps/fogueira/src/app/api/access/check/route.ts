import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAccess, checkAccessBatch } from "../../../../lib/gating";

const checkAccessSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  ruleId: z.string().uuid().optional(),
  ruleIds: z.array(z.string().uuid()).optional(),
});

/**
 * POST /api/access/check
 *
 * Check if a wallet has access based on gating rules.
 * Can check a single rule or multiple rules at once.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkAccessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { walletAddress, ruleId, ruleIds } = parsed.data;

    // Must provide either ruleId or ruleIds
    if (!ruleId && (!ruleIds || ruleIds.length === 0)) {
      return NextResponse.json(
        { error: "Must provide either ruleId or ruleIds" },
        { status: 400 },
      );
    }

    // Single rule check
    if (ruleId) {
      const result = await checkAccess(walletAddress, ruleId);
      return NextResponse.json({
        hasAccess: result.hasAccess,
        reason: result.reason,
      });
    }

    // Batch check
    if (ruleIds && ruleIds.length > 0) {
      const results = await checkAccessBatch(walletAddress, ruleIds);
      const response: Record<string, { hasAccess: boolean; reason?: string }> =
        {};

      for (const [id, result] of results) {
        response[id] = {
          hasAccess: result.hasAccess,
          ...(result.reason && { reason: result.reason }),
        };
      }

      return NextResponse.json({ results: response });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

