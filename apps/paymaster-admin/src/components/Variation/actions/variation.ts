"use server";

import { verifyLogInToken } from "@fogo/sessions-sdk";
import { revalidateTag } from "next/cache";
import { ZodError, z } from "zod";
import { TransactionVariations } from "../../../db-schema";
import { connection } from "../../../fogo-connection";
import {
  createVariation as createVariationPaymaster,
  deleteVariation as deleteVariationPaymaster,
  fetchUserPaymasterData,
  updateVariation as updateVariationPaymaster,
} from "../../../server/paymaster";

const createOrUpdateVariationSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  maxGasSpend: z.coerce
    .number()
    .min(1, { message: "Max gas spend is required" }),
  variation: TransactionVariations,
});

export const createOrUpdateVariation = async ({
  variationId,
  domainConfigId,
  name,
  maxGasSpend,
  variation,
  sessionToken,
}: {
  variationId?: string | undefined;
  domainConfigId: string;
  name: string;
  maxGasSpend: string;
  variation: TransactionVariations;
  sessionToken: string;
}) => {
  "use server";
  const sessionAccount = await verifyLogInToken(sessionToken, connection);
  const userAddress = sessionAccount?.user.toString();
  if (!userAddress) {
    throw new Error("User not found");
  }
  try {
    const validatedFields = createOrUpdateVariationSchema.parse({
      name,
      maxGasSpend,
      variation,
    });
    if (variationId) {
      await updateVariationPaymaster(userAddress, variationId, {
        name: validatedFields.name,
        maxGasSpend: validatedFields.maxGasSpend,
        variation: validatedFields.variation,
      });
    } else {
      await createVariationPaymaster(userAddress, domainConfigId, {
        name: validatedFields.name,
        maxGasSpend: validatedFields.maxGasSpend,
        variation: validatedFields.variation,
      });
    }
    revalidateTag("user-data", "max");
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw new Error(error.errors.map((error) => error.message).join(", "));
    } else {
      throw new Error(String(error));
    }
  }

  return fetchUserPaymasterData(userAddress);
};

export const deleteVariation = async ({
  variationId,
  sessionToken,
}: {
  variationId: string;
  sessionToken: string;
}) => {
  "use server";
  const sessionAccount = await verifyLogInToken(sessionToken, connection);
  const userAddress = sessionAccount?.user.toString();
  if (!userAddress) {
    throw new Error("User not found");
  }
  await deleteVariationPaymaster(userAddress, variationId);

  revalidateTag("user-data", "max");

  return true;
};
