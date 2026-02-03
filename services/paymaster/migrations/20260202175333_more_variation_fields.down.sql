ALTER TABLE variation
  DROP COLUMN IF EXISTS swap_into_fogo,
  DROP COLUMN IF EXISTS paymaster_fee_lamports;