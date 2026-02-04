import { z } from "zod";

export const UUID = z.string().uuid();
export const Base58Pubkey = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Invalid base58 pubkey")
  .min(32)
  .max(44);
const u16 = z.number().int().min(0).max(65_535);
const u64 = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

const TimeStr = z.preprocess(
  (val) =>
    typeof val === "string" || typeof val === "number" ? new Date(val) : val,
  z.date(),
);

export const PrimitiveDataValueSchema = z.union([
  z.object({ U8: z.number().int().min(0).max(255) }),
  z.object({ U16: z.number().int().min(0).max(65_535) }),
  // prettier-ignore
  z.object({ U32: z.number().int().min(0).max(0xff_ff_ff_ff) }),
  z.object({ U64: u64 }),
  z.object({ Bool: z.boolean() }),
  z.object({ Pubkey: Base58Pubkey }),
  z.object({
    Bytes: z.string().regex(/^[0-9a-fA-F]*$/, "Hex string expected"),
  }),
]);

export const PrimitiveDataTypeSchema = z.union([
  z.enum(["U8", "U16", "U32", "U64", "Bool", "pubkey"]),
  z.object({ Bytes: z.object({ length: z.number().int().min(0) }) }),
]);
export const DataConstraintSpecificationSchema = z.union([
  z.object({ LessThan: PrimitiveDataValueSchema }),
  z.object({ GreaterThan: PrimitiveDataValueSchema }),
  z.object({ EqualTo: z.array(PrimitiveDataValueSchema).min(1) }),
  z.object({ Neq: z.array(PrimitiveDataValueSchema).min(1) }),
]);

export const DataConstraintSchema = z.object({
  start_byte: u16,
  data_type: PrimitiveDataTypeSchema,
  constraint: DataConstraintSpecificationSchema,
});

export const ContextualPubkeySchema = z.union([
  z.object({ Explicit: z.object({ pubkey: Base58Pubkey }) }),
  z.literal("Sponsor"),
  z.literal("NonFeePayerSigner"),
  z.literal("DomainRegistry"),
]);

export const AccountConstraintSchema = z.object({
  index: u16,
  include: z.array(ContextualPubkeySchema).default([]),
  exclude: z.array(ContextualPubkeySchema).default([]),
});

export const InstructionConstraintSchema = z.object({
  program: Base58Pubkey,
  accounts: z.array(AccountConstraintSchema).default([]),
  data: z.array(DataConstraintSchema).default([]),
  required: z.boolean(),
  requires_wrapped_native_tokens: z.boolean(),
});

export const TransactionVariations = z.array(InstructionConstraintSchema);

// Database variation schemas (version, name, max_gas_spend are separate columns)
// The transaction_variation JSONB field contains different data based on version:
// - v0: array of program pubkeys (whitelisted_programs)
// - v1: array of instruction constraints
export const VariationV0Schema = z.object({
  id: UUID,
  version: z.literal("v0"),
  name: z.string(),
  transaction_variation: z.array(Base58Pubkey),
  created_at: TimeStr,
  updated_at: TimeStr,
});

export const VariationV1Schema = z.object({
  id: UUID,
  version: z.literal("v1"),
  name: z.string(),
  transaction_variation: TransactionVariations,
  max_gas_spend: u64,
  created_at: TimeStr,
  updated_at: TimeStr,
});

export const VariationSchema = z.discriminatedUnion("version", [
  VariationV0Schema,
  VariationV1Schema,
]);

export const NetworkEnvironmentSchema = z.enum([
  "mainnet",
  "testnet",
  "localnet",
]);

export const DomainConfigWithVariationsSchema = z.object({
  id: UUID,
  domain: z.string(),
  network_environment: NetworkEnvironmentSchema,
  enable_session_management: z.boolean(),
  enable_preflight_simulation: z.boolean(),
  created_at: TimeStr,
  updated_at: TimeStr,
  variations: z.array(VariationSchema),
});

export const AppWithDomainConfigsSchema = z.object({
  id: UUID,
  name: z.string(),
  created_at: TimeStr,
  updated_at: TimeStr,
  domain_configs: z.array(DomainConfigWithVariationsSchema),
});

export const UserSchema = z.object({
  id: UUID,
  username: z.string(),
  wallet_address: z.string(),
  created_at: TimeStr,
  updated_at: TimeStr,
  apps: z.array(AppWithDomainConfigsSchema),
});

export type User = z.infer<typeof UserSchema>;
export type App = z.infer<typeof AppWithDomainConfigsSchema>;
export type DomainConfig = z.infer<typeof DomainConfigWithVariationsSchema>;
export type Variation = z.infer<typeof VariationSchema>;
export type TransactionVariations = z.infer<typeof TransactionVariations>;
