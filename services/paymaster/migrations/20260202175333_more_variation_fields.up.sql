ALTER TABLE variation
  ADD COLUMN swap_into_fogo jsonb NULL,
  ADD COLUMN paymaster_fee_lamports bigint NULL;
