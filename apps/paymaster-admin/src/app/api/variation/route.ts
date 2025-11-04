import { NextRequest, NextResponse } from "next/server";
import z, { ZodError } from "zod";

import { TransactionVariationSchema, UUID } from "../../../db-schema";
import { updateVariation } from "../../../server/paymaster";

const querySchema = z.object({
  variationId: UUID,
});

export const PATCH = async (req: NextRequest) => {
  try {
    const { variationId } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const data = TransactionVariationSchema.parse(await req.json());
    await updateVariation(variationId, data);
    return NextResponse.json({ message: "Variation updated" });
  } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation error", issues: error.issues },
          { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
};
