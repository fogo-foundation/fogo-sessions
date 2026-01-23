"use server";

import { v4 as uuidv4 } from "uuid";
import { sql } from "../config/neon";
import type { TransactionVariations } from "../db-schema";
import { UserSchema } from "../db-schema";

export const fetchUserPaymasterData = async (walletAddress: string) => {
  const [user] = await sql`
    SELECT
          (
            -- apps the user owns (via app.user_id)
            SELECT COALESCE(json_agg(app_row), '[]'::json)
            FROM (
              SELECT
                a.id,
                a.name,
                a.created_at,
                a.updated_at,
                (
                  -- domain configs for this app
                  SELECT COALESCE(json_agg(dc_row), '[]'::json)
                  FROM (
                    SELECT
                      dc.id,
                      dc.domain,
                      dc.network_environment,
                      dc.enable_session_management,
                      dc.enable_preflight_simulation,
                      dc.created_at,
                      dc.updated_at,
                      (
                        -- variations for this domain config
                        SELECT COALESCE(json_agg(v_row), '[]'::json)
                        FROM (
                          SELECT
                            v.id,
                            v.name,
                            v.version,
                            v.transaction_variation,
                            v.max_gas_spend,
                            v.created_at,
                            v.updated_at
                          FROM variation v
                          WHERE v.domain_config_id = dc.id
                          ORDER BY v.created_at ASC, v.id ASC
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
        FROM "user" u
        WHERE u.wallet_address = ${walletAddress}
  `;
  if (!user) {
    return;
  }
  return UserSchema.parse(user);
};

export const updateVariation = async (
  walletAddress: string,
  variationId: string,
  data: {
    name: string;
    maxGasSpend: number;
    variation: TransactionVariations;
  },
) => {
  const [variation] = await sql`
    UPDATE variation v
    SET
      name = ${data.name},
      max_gas_spend = ${data.maxGasSpend},
      transaction_variation = ${JSON.stringify(data.variation)}::jsonb,
      updated_at = now()
    FROM domain_config dc
    JOIN app a ON a.id = dc.app_id
    JOIN "user" u ON u.id = a.user_id
    WHERE
      v.id = ${variationId}
      AND v.domain_config_id = dc.id
      AND u.wallet_address = ${walletAddress}
    RETURNING v.*
  `;

  if (!variation) {
    throw new Error("Not found or not authorized");
  }

  return true;
};

export const createVariation = async (
  walletAddress: string,
  domainConfigId: string,
  data: {
    name: string;
    maxGasSpend: number;
    variation: TransactionVariations;
  },
) => {
  const [domainConfig] = await sql`
    SELECT dc.* FROM domain_config dc
    JOIN app a ON a.id = dc.app_id
    JOIN "user" u ON u.id = a.user_id
    WHERE
      dc.id = ${domainConfigId}
      AND u.wallet_address = ${walletAddress}
  `;

  if (!domainConfig) {
    throw new Error("Domain config not found or unauthorized");
  }

  const [variation] = await sql`
    INSERT INTO variation (id, domain_config_id, name, max_gas_spend, transaction_variation, version, created_at, updated_at)
    VALUES (${uuidv4()}, ${domainConfigId}, ${data.name}, ${data.maxGasSpend}, ${JSON.stringify(data.variation)}::jsonb, 'v1', now(), now())
    RETURNING id
  `;

  if (!variation) {
    throw new Error("Failed to create variation");
  }

  return true;
};

export const deleteVariation = async (
  walletAddress: string,
  variationId: string,
) => {
  const [variation] = await sql`
    DELETE FROM variation v
    USING domain_config dc, app a, "user" u
    WHERE v.domain_config_id = dc.id
    AND dc.app_id = a.id
    AND a.user_id = u.id
    AND v.id = ${variationId}
    AND u.wallet_address = ${walletAddress}
    RETURNING v.*
  `;
  if (!variation) {
    throw new Error("Not found or not authorized");
  }

  return true;
};
