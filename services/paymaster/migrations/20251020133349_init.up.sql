CREATE TYPE app_role AS ENUM ('owner', 'admin');

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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE app_user (
  app_id  uuid NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role    app_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (app_id, user_id)
);

-- this makes sure that there is only one owner per app
CREATE UNIQUE INDEX IF NOT EXISTS app_user_owner_one
  ON app_user (app_id)
  WHERE role = 'owner';

CREATE TABLE domain_config (
  id uuid PRIMARY KEY,                           
  app_id uuid NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  enable_session_management boolean NOT NULL DEFAULT false,
  enable_preflight_simulation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE variation (
  id uuid PRIMARY KEY,                           
  domain_config_id uuid NOT NULL REFERENCES domain_config(id) ON DELETE CASCADE,
  transaction_variation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
