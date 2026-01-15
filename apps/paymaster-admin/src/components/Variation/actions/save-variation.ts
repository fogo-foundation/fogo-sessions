"use server";

import { headers } from "next/headers";
import { parse } from "smol-toml";
import { z } from "zod";
import { sql } from "../../../config/neon";

const schema = z.object({
  variationId: z.string().uuid({ message: "Invalid variation ID" }),
  domainConfigId: z.string().uuid({ message: "Invalid domain config ID" }),
  name: z.string().min(1, { message: "Name is required" }),
  maxGasSpend: z
    .string()
    .min(1, { message: "Max gas spend is required" })
    .transform((val) => {
      const num = Number(val);
      if (Number.isNaN(num) || num < 0) {
        throw new Error("Max gas spend must be a valid non-negative number");
      }
      return num;
    }),
  code: z.string().min(1, { message: "Code is required" }),
});

export const saveVariation = async (
  { variationId, sessionToken }: { variationId: string; sessionToken: string },
  _prevState: unknown,
  formData: FormData,
) => {
  "use server";
  console.log(_prevState, formData);
  // const validatedFields = schema.safeParse({
  //   variationId: formData.get("variationId"),
  //   domainConfigId: formData.get("domainConfigId"),
  //   name: formData.get("name"),
  //   maxGasSpend: formData.get("maxGasSpend"),
  //   code: formData.get("code"),
  // });
  // console.log(validatedFields, formData);
  // if (!validatedFields.success) {
  //   return {
  //     errors: validatedFields.error.flatten().fieldErrors,
  //   };
  // }
};
