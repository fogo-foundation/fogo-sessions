CREATE TYPE variation_version AS ENUM ('v0', 'v1');
CREATE TYPE network_environment AS ENUM ('mainnet', 'testnet', 'localnet');

CREATE TABLE "user" (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  wallet_address text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app (
  id uuid PRIMARY KEY,
  name text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE domain_config (
  id uuid PRIMARY KEY,
  app_id uuid NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  domain text NOT NULL,
  network_environment network_environment NOT NULL,
  enable_session_management boolean NOT NULL DEFAULT false,
  enable_preflight_simulation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT domain_config_domain_network_environment_unique UNIQUE (domain, network_environment)
);


CREATE TABLE variation (
  id uuid PRIMARY KEY,                           
  domain_config_id uuid NOT NULL REFERENCES domain_config(id) ON DELETE CASCADE,
  name text NOT NULL,
  version variation_version NOT NULL,
  max_gas_spend bigint,
  transaction_variation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT variation_domain_name_unique UNIQUE (domain_config_id, name)
);
