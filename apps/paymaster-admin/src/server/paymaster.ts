import pool from "./pg"
import { z } from "zod";

/* -------------------- Common primitives -------------------- */

export const UUID = z.string().uuid();

/** Solana pubkey as base58 string (conservative check) */
export const Base58Pubkey = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Invalid base58 pubkey")
  .min(32)
  .max(44);

/** u16 and u64 (safe JS integer) */
const u16 = z.number().int().min(0).max(65535);
const u64 = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

/** Timestamp as string (from timestamptz). Switch to z.coerce.date() if you want Date objects. */
const TimeStr = z.string();

/* -------------------- 1) Variation “instructions” (Rust parity) -------------------- */


/** PrimitiveDataValue */
export const PrimitiveDataValueSchema = z.union([
  z.object({ kind: z.literal("U8"), value: z.number().int().min(0).max(255) }),
  z.object({ kind: z.literal("U16"), value: z.number().int().min(0).max(65535) }),
  z.object({ kind: z.literal("U32"), value: z.number().int().min(0).max(0xffffffff) }),
  z.object({ kind: z.literal("U64"), value: u64 }),
  z.object({ kind: z.literal("Bool"), value: z.boolean() }),
  z.object({ kind: z.literal("Pubkey"), value: Base58Pubkey }),
  z.object({
    kind: z.literal("Bytes"),
    value: z.string().regex(/^[0-9a-fA-F]*$/, "Hex string expected"),
  }),
]);
export const PrimitiveDataTypeSchema = z.union([
  z.literal("U8"),
  z.literal("U16"),
  z.literal("U32"),
  z.literal("U64"),
  z.literal("Bool"),
  z.literal("Pubkey"),
  z.object({ Bytes: z.object({ length: z.number().int().min(0) }) }),
]);
/** DataConstraintSpecification */
export const DataConstraintSpecificationSchema =  z.union([
  z.object({ LessThan: PrimitiveDataValueSchema }),
  z.object({ GreaterThan: PrimitiveDataValueSchema }),
  z.object({ EqualTo: z.array(PrimitiveDataValueSchema).min(1) }),
  z.object({ Neq: z.array(PrimitiveDataValueSchema).min(1) }),
]);

/** DataConstraint */
export const DataConstraintSchema = z.object({
  start_byte: u16,
  data_type: PrimitiveDataTypeSchema,
  constraint: DataConstraintSpecificationSchema,
});

/** ContextualPubkey */
export const ContextualPubkeySchema = z.union([
  z.object({ Explicit: z.object({ pubkey: Base58Pubkey }) }),
  z.literal("Sponsor"),
  z.literal("NonFeePayerSigner"),
  z.literal("DomainRegistry"),
]);
/** AccountConstraint */
export const AccountConstraintSchema = z.object({
  index: u16,
  include: z.array(ContextualPubkeySchema).default([]),
  exclude: z.array(ContextualPubkeySchema).default([]),
});

/** InstructionConstraint */
export const InstructionConstraintSchema = z.object({
  program: Base58Pubkey,
  accounts: z.array(AccountConstraintSchema).default([]),
  data: z.array(DataConstraintSchema).default([]),
  required: z.boolean(),
});

/** TransactionVariation (tagged enum on `version`) */
export const VariationProgramWhitelistSchema = z.object({
  version: z.literal("v0"),
  name: z.string(),
  whitelisted_programs: z.array(Base58Pubkey),
});

export const VariationOrderedInstructionConstraintsSchema = z.object({
  version: z.literal("v1"),
  name: z.string(),
  instructions: z.array(InstructionConstraintSchema).default([]),
  max_gas_spend: u64,
});

export const TransactionVariationSchema = z.discriminatedUnion("version", [
  VariationProgramWhitelistSchema,
  VariationOrderedInstructionConstraintsSchema,
]);

/* -------------------- 2) DB row schemas -------------------- */

export const UserRowSchema = z.object({
  id: UUID,
  username: z.string(),
  wallet_address: z.string(), // if you want, validate as Base58Pubkey too
  created_at: TimeStr,
  updated_at: TimeStr,
});

export const AppRowSchema = z.object({
  id: UUID,
  user_id: UUID,
  name: z.string(),
  created_at: TimeStr,
  updated_at: TimeStr,
});

export const DomainConfigRowSchema = z.object({
  id: UUID,
  app_id: UUID,
  domain: z.string(),
  enable_session_management: z.boolean(),
  enable_preflight_simulation: z.boolean(),
  created_at: TimeStr,
  updated_at: TimeStr,
});

export const VariationRowSchema = z.object({
  id: UUID,
  domain_config_id: UUID,
  instructions: TransactionVariationSchema, // <- your JSONB payload, strongly typed
  created_at: TimeStr,
  updated_at: TimeStr,
});

/* -------------------- 3b) Nested “deep” shape (User -> Apps -> DomainConfigs -> Variations) -------------------- */

export const VariationSchema = z.object({
  id: UUID,
  instructions: TransactionVariationSchema,
  created_at: TimeStr,
  updated_at: TimeStr,
});

export const DomainConfigWithVariationsSchema = z.object({
  id: UUID,
  domain: z.string(),
  enable_session_management: z.boolean(),
  enable_preflight_simulation: z.boolean(),
  created_at: TimeStr,
  updated_at: TimeStr,
  variations: z.array(VariationSchema),
  // variations: z.any(),
});

export const AppWithDomainConfigsSchema = z.object({
  id: UUID,
  name: z.string(),
  created_at: TimeStr,
  updated_at: TimeStr,
  domain_configs: z.array(DomainConfigWithVariationsSchema),
});

export const UserDeepSchema = z.object({
  id: UUID,
  username: z.string(),
  wallet_address: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
  apps: z.array(AppWithDomainConfigsSchema),
});

/* -------------------- Types -------------------- */

export type UserRow = z.infer<typeof UserRowSchema>;
export type AppRow = z.infer<typeof AppRowSchema>;
export type DomainConfigRow = z.infer<typeof DomainConfigRowSchema>;
export type VariationRow = z.infer<typeof VariationRowSchema>;

export type UserDeep = z.infer<typeof UserDeepSchema>;
export type TransactionVariation = z.infer<typeof TransactionVariationSchema>;

export const fetchUserPaymasterData = async ({ walletAddress }: { walletAddress: string }) => {
  const { rows } = await pool.query(`WITH u AS (
  SELECT * FROM "user" WHERE wallet_address = $1
)
SELECT (
  SELECT json_agg(app_row)
  FROM (
    SELECT
      a.id,
      a.name,
      a.created_at,
      a.updated_at,
      (
        SELECT json_agg(dc_row)
        FROM (
          SELECT
            dc.id,
            dc.domain,
            dc.enable_session_management,
            dc.enable_preflight_simulation,
            dc.created_at,
            dc.updated_at,
            (
              SELECT json_agg(v_row)
              FROM (
                SELECT
                  v.id,
                  v.instructions,
                  v.created_at,
                  v.updated_at
                FROM variation v
                WHERE v.domain_config_id = dc.id
              ) AS v_row
            ) AS variations
          FROM domain_config dc
          WHERE dc.app_id = a.id
        ) AS dc_row
      ) AS domain_configs
    FROM app a
    WHERE a.user_id = u.id
  ) AS app_row
) AS apps,
u.id,
u.username,
u.wallet_address,
u.created_at,
u.updated_at
FROM u;
`, [walletAddress]);
const userPaymasterData = UserDeepSchema.parse(rows[0]);
  return userPaymasterData;
}
