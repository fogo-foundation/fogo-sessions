import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { VariationSchema, UUID } from "../../../db-schema";
import { updateVariation } from "../../../server/paymaster";

const querySchema = z.object({
  variationId: UUID,
});

export const PATCH = async (req: NextRequest) => {
  // 1. Verify the user is authenticated (has sesssion token in cookies)
  // 2. get the public key from the session token
  // 3. check if the public key is the same as the one in the database
  try {
    const { variationId } = querySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    const data = VariationSchema.parse(await req.json());
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
