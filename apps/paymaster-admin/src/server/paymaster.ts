import { verifyLogInToken } from "@fogo/sessions-sdk";

import pool from "./pg";
import { UserSchema } from "../db-schema";
import { connection } from "../fogo-connection";

export const fetchPaymasterDataFromToken = async ({
  token,
}: {
  token: string;
}) => {
  const acc = await verifyLogInToken(token, connection);
  if (!acc) {
    throw new Error("Invalid token");
  }
  return fetchUserPaymasterData({ walletAddress: acc.user.toString() });
};

export const fetchUserPaymasterData = async ({
  walletAddress,
}: {
  walletAddress: string;
}) => {
  const { rows } = await pool.query(
    `WITH u AS (
  SELECT * FROM "user" WHERE wallet_address = $1
)
SELECT
  (
    -- apps the user belongs to, via app_user
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
                    v.transaction_variation,
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
      JOIN app_user au ON au.app_id = a.id
      WHERE au.user_id = u.id
    ) AS app_row
  ) AS apps,
  u.id,
  u.username,
  u.wallet_address,
  u.created_at,
  u.updated_at
FROM u;
`,
    [walletAddress],
  );
  const userPaymasterData = UserSchema.parse(rows[0]);
  return userPaymasterData;
};
