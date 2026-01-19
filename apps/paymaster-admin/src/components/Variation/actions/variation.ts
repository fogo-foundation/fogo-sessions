'use server';

import { verifyLogInToken } from '@fogo/sessions-sdk';
import { revalidateTag } from 'next/cache';
import { parse } from 'smol-toml';
import { z } from 'zod';
import { TransactionVariations } from '../../../db-schema';
import { connection } from '../../../fogo-connection';
import {
  createVariation as createVariationPaymaster,
  deleteVariation as deleteVariationPaymaster,
  updateVariation as updateVariationPaymaster,
} from '../../../server/paymaster';

const variationSchema = z.object({
  isEditingJson: z.boolean(),
  name: z.string().min(1, { message: 'Name is required' }),
  maxGasSpend: z.coerce
    .number()
    .min(1, { message: 'Max gas spend is required' }),
  code: z.string(),
});

export const updateVariation = async (
  {
    variationId,
    sessionToken,
    isEditingJson,
  }: { variationId: string; sessionToken: string; isEditingJson: boolean },
  _prevState: unknown,
  formData: FormData
) => {
  'use server';
  const sessionAccount = await verifyLogInToken(sessionToken, connection);
  const userAddress = sessionAccount?.user.toString();
  if (!userAddress) {
    throw new Error('User not found');
  }
  const validatedFields = variationSchema.parse({
    name: formData.get('name'),
    maxGasSpend: formData.get('maxGasSpend'),
    code: formData.get('code'),
    isEditingJson,
  });

  const code = isEditingJson
    ? JSON.parse(validatedFields.code)
    : (
        parse(validatedFields.code) as {
          domains: {
            tx_variations: { instructions: TransactionVariations };
          };
        }
      ).domains.tx_variations.instructions;

  await updateVariationPaymaster(userAddress, variationId, {
    name: validatedFields.name,
    maxGasSpend: validatedFields.maxGasSpend,
    transactionVariation: TransactionVariations.parse(code),
  });

  revalidateTag('user-data', 'max');

  return { success: true };
};

export const createVariation = async (
  {
    domainConfigId,
    sessionToken,
    isEditingJson,
  }: { domainConfigId: string; sessionToken: string; isEditingJson: boolean },
  _prevState: unknown,
  formData: FormData
) => {
  'use server';
  const sessionAccount = await verifyLogInToken(sessionToken, connection);
  const userAddress = sessionAccount?.user.toString();
  if (!userAddress) {
    throw new Error('User not found');
  }
  const validatedFields = variationSchema.parse({
    name: formData.get('name'),
    maxGasSpend: formData.get('maxGasSpend'),
    code: formData.get('code'),
    isEditingJson,
  });

  const code = isEditingJson
    ? JSON.parse(validatedFields.code)
    : (
        parse(validatedFields.code) as {
          domains: {
            tx_variations: { instructions: TransactionVariations };
          };
        }
      ).domains.tx_variations.instructions;

  await createVariationPaymaster(userAddress, domainConfigId, {
    name: validatedFields.name,
    maxGasSpend: validatedFields.maxGasSpend,
    transactionVariation: TransactionVariations.parse(code),
  });

  revalidateTag('user-data', 'max');

  return { success: true };
};

export const deleteVariation = async (
  { variationId, sessionToken }: { variationId: string; sessionToken: string },
  _prevState: unknown
) => {
  'use server';
  const sessionAccount = await verifyLogInToken(sessionToken, connection);
  const userAddress = sessionAccount?.user.toString();
  if (!userAddress) {
    throw new Error('User not found');
  }
  await deleteVariationPaymaster(userAddress, variationId);

  revalidateTag('user-data', 'max');

  return { success: true };
};
