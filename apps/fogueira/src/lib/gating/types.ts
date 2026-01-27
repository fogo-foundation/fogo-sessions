/**
 * Token Gating Rule Expression Types
 *
 * Gating rules are stored as JSON expressions that define conditions for access.
 * Conditions can be combined using AND/OR operators.
 */

/** Base condition for a single token check */
export type TokenCondition = {
  type: "token";
  /** The mint address of the token (SPL token or NFT collection) */
  mintAddress: string;
  /** Minimum amount required (for fungible tokens, use "1" for NFTs) */
  minAmount: string;
};

/** NFT collection ownership check */
export type NftCondition = {
  type: "nft";
  /** The collection mint address (Metaplex Certified Collection) */
  collectionMint: string;
  /** Minimum number of NFTs from this collection required */
  minCount: number;
};

/** Membership product ownership check */
export type MembershipCondition = {
  type: "membership";
  /** The membership product ID */
  membershipProductId: string;
};

/** Single condition type */
export type GatingCondition = TokenCondition | NftCondition | MembershipCondition;

/** Logical AND - all conditions must be met */
export type AndExpression = {
  type: "and";
  conditions: GatingExpression[];
};

/** Logical OR - at least one condition must be met */
export type OrExpression = {
  type: "or";
  conditions: GatingExpression[];
};

/** Full expression type - can be a single condition or compound */
export type GatingExpression =
  | GatingCondition
  | AndExpression
  | OrExpression;

/** Result of evaluating a gating rule */
export type GatingResult = {
  hasAccess: boolean;
  reason?: string | undefined;
  /** Details about which conditions passed/failed */
  details?: {
    condition: GatingCondition;
    passed: boolean;
    actualValue?: string | undefined;
  }[];
};

