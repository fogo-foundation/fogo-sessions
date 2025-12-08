
import pool from "../config/pg";
import { UserSchema } from "../db-schema";

export const fetchUserPaymasterData = async (walletAddress: string) => {
  const { rows } = await pool.query(
    `SELECT
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
                    ) AS v_row
                  ) AS variations
                FROM domain_config dc
                WHERE dc.app_id = a.id
              ) AS dc_row
            ) AS domain_configs
          FROM app a
          INNER JOIN app_user au ON au.app_id = a.id
          WHERE au.user_id = u.id
        ) AS app_row
      ) AS apps,
      u.id,
      u.username,
      u.wallet_address,
      u.created_at,
      u.updated_at
    FROM "user" u
    WHERE u.wallet_address = $1
    `,
    [walletAddress],
  );

  // If user doesn't exist in database, return undefined
  if (!rows[0]) {
    return;
  }

  return UserSchema.parse(rows[0]);
};
