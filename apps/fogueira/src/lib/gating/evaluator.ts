import { PublicKey } from "@solana/web3.js";
import { connection } from "../../fogo-connection";
import { prisma } from "../prisma";
import type { TokenChecker } from "./token-checker";
import { createTokenChecker } from "./token-checker";
import type { GatingCondition, GatingExpression, GatingResult } from "./types";

/**
 * Evaluates gating rules against wallet holdings
 */
export class GatingEvaluator {
  private tokenChecker: TokenChecker;

  constructor(tokenChecker?: TokenChecker) {
    this.tokenChecker = tokenChecker || createTokenChecker();
  }

  /**
   * Evaluate a gating expression for a wallet
   */
  async evaluate(
    walletAddress: string,
    expression: GatingExpression,
  ): Promise<GatingResult> {
    const details: GatingResult["details"] = [];

    const result = await this.evaluateExpression(
      walletAddress,
      expression,
      details,
    );

    return {
      hasAccess: result,
      reason: result ? "All conditions met" : "One or more conditions not met",
      details,
    };
  }

  private async evaluateExpression(
    walletAddress: string,
    expression: GatingExpression,
    details: NonNullable<GatingResult["details"]>,
  ): Promise<boolean> {
    switch (expression.type) {
      case "and":
        // All conditions must pass
        for (const condition of expression.conditions) {
          const result = await this.evaluateExpression(
            walletAddress,
            condition,
            details,
          );
          if (!result) return false;
        }
        return true;

      case "or":
        // At least one condition must pass
        for (const condition of expression.conditions) {
          const result = await this.evaluateExpression(
            walletAddress,
            condition,
            details,
          );
          if (result) return true;
        }
        return false;

      case "token":
        return this.evaluateTokenCondition(walletAddress, expression, details);

      case "nft":
        return this.evaluateNftCondition(walletAddress, expression, details);

      case "membership":
        return this.evaluateMembershipCondition(
          walletAddress,
          expression,
          details,
        );

      default:
        return false;
    }
  }

  private async evaluateTokenCondition(
    walletAddress: string,
    condition: GatingCondition & { type: "token" },
    details: NonNullable<GatingResult["details"]>,
  ): Promise<boolean> {
    const result = await this.tokenChecker.hasTokenBalance(
      walletAddress,
      condition.mintAddress,
      condition.minAmount,
    );

    details.push({
      condition,
      passed: result.hasBalance,
      actualValue: result.actualAmount,
    });

    return result.hasBalance;
  }

  private async evaluateNftCondition(
    walletAddress: string,
    condition: GatingCondition & { type: "nft" },
    details: NonNullable<GatingResult["details"]>,
  ): Promise<boolean> {
    const result = await this.tokenChecker.hasNftFromCollection(
      walletAddress,
      condition.collectionMint,
      condition.minCount,
    );

    details.push({
      condition,
      passed: result.hasNft,
      actualValue: result.count.toString(),
    });

    return result.hasNft;
  }

  private async evaluateMembershipCondition(
    walletAddress: string,
    condition: GatingCondition & { type: "membership" },
    details: NonNullable<GatingResult["details"]>,
  ): Promise<boolean> {
    // Get membership product details
    const membership = await prisma.membershipProduct.findUnique({
      where: { id: condition.membershipProductId },
    });

    if (!membership) {
      details.push({
        condition,
        passed: false,
        actualValue: "membership not found",
      });
      return false;
    }

    // For direct sale: ONLY grant access with verified on-chain transaction
    if (membership.saleMode === "direct") {
      const purchase = await prisma.membershipPurchase.findUnique({
        where: {
          membershipProductId_walletAddress: {
            membershipProductId: condition.membershipProductId,
            walletAddress,
          },
        },
      });

      // Require transaction signature for paid memberships
      const isPaid = membership.priceAmount && membership.priceAmount !== "0";

      if (isPaid) {
        // For paid memberships, transaction signature is REQUIRED
        if (!purchase?.transactionSignature) {
          details.push({
            condition,
            passed: false,
            actualValue: "no transaction",
          });
          return false;
        }

        // Verify transaction on-chain
        try {
          const tx = await connection.getTransaction(
            purchase.transactionSignature,
            {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            },
          );

          if (tx && tx.meta?.err === null) {
            // Transaction exists and succeeded
            const treasuryPubkey = membership.treasuryAddress
              ? new PublicKey(membership.treasuryAddress)
              : null;

            if (treasuryPubkey) {
              // Check if transaction includes treasury address
              const accountKeys = tx.transaction.message.getAccountKeys();
              const hasTransfer = accountKeys.staticAccountKeys.some(
                (pubkey: PublicKey) => {
                  return (
                    pubkey.equals(treasuryPubkey) ||
                    pubkey.toBase58() === membership.treasuryAddress
                  );
                },
              );

              if (hasTransfer) {
                details.push({
                  condition,
                  passed: true,
                  actualValue: "verified on-chain",
                });
                return true;
              }
            }
          }

          // Transaction not found or failed
          details.push({
            condition,
            passed: false,
            actualValue: "transaction failed",
          });
          return false;
        } catch (error) {
          details.push({
            condition,
            passed: false,
            actualValue: "verification error",
          });
          return false;
        }
      } else {
        // For free memberships, just check if there's a purchase record
        if (purchase?.status === "completed") {
          details.push({
            condition,
            passed: true,
            actualValue: "free membership claimed",
          });
          return true;
        }

        details.push({
          condition,
          passed: false,
          actualValue: "not claimed",
        });
        return false;
      }
    }

    // For NFT-based memberships (Candy Machine): Check blockchain for NFT holdings
    if (membership.nftCollectionMint) {
      const result = await this.tokenChecker.hasNftFromCollection(
        walletAddress,
        membership.nftCollectionMint,
        1,
      );

      details.push({
        condition,
        passed: result.hasNft,
        actualValue: result.count.toString(),
      });

      return result.hasNft;
    }

    // No valid membership configuration
    details.push({
      condition,
      passed: false,
      actualValue: "invalid configuration",
    });
    return false;
  }
}

/**
 * Check access for a wallet against a gating rule
 */
export async function checkAccess(
  walletAddress: string,
  ruleId: string,
): Promise<GatingResult> {
  // Check cache first
  const cachedCheck = await prisma.accessCheck.findUnique({
    where: {
      walletAddress_ruleId: {
        walletAddress,
        ruleId,
      },
    },
  });

  if (cachedCheck && cachedCheck.expiresAt > new Date()) {
    return {
      hasAccess: cachedCheck.hasAccess,
      reason: cachedCheck.reason ?? undefined,
    };
  }

  // Get the rule
  const rule = await prisma.gatingRule.findUnique({
    where: { id: ruleId },
  });

  if (!rule) {
    return {
      hasAccess: false,
      reason: "Gating rule not found",
    };
  }

  // Evaluate the rule
  const evaluator = new GatingEvaluator();
  const result = await evaluator.evaluate(
    walletAddress,
    rule.expression as GatingExpression,
  );

  // Cache the result (expires in 5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.accessCheck.upsert({
    where: {
      walletAddress_ruleId: {
        walletAddress,
        ruleId,
      },
    },
    create: {
      walletAddress,
      ruleId,
      hasAccess: result.hasAccess,
      reason: result.reason ?? null,
      expiresAt,
    },
    update: {
      hasAccess: result.hasAccess,
      reason: result.reason ?? null,
      expiresAt,
    },
  });

  return result;
}

/**
 * Check access for multiple rules at once
 */
export async function checkAccessBatch(
  walletAddress: string,
  ruleIds: string[],
): Promise<Map<string, GatingResult>> {
  const results = new Map<string, GatingResult>();

  // Run checks in parallel
  const checks = await Promise.all(
    ruleIds.map(async (ruleId) => ({
      ruleId,
      result: await checkAccess(walletAddress, ruleId),
    })),
  );

  for (const { ruleId, result } of checks) {
    results.set(ruleId, result);
  }

  return results;
}

/**
 * Invalidate cached access checks for a wallet
 */
export async function invalidateAccessCache(
  walletAddress: string,
): Promise<void> {
  await prisma.accessCheck.deleteMany({
    where: { walletAddress },
  });
}
