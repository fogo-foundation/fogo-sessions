CREATE TABLE if not exists "user" (
  id uuid PRIMARY KEY default uuidv7(),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE if not exists app (
  id uuid PRIMARY KEY default uuidv7(),
  user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE if not exists domain_config (
  id uuid PRIMARY KEY default uuidv7(),                           
  app_id uuid NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  enable_session_management boolean NOT NULL DEFAULT false,
  enable_preflight_simulation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX domain_config_domain_idx ON domain_config (domain);

CREATE TABLE if not exists variation (
  id uuid PRIMARY KEY default uuidv7(),                           
  domain_config_id uuid NOT NULL REFERENCES domain_config(id) ON DELETE CASCADE,
  instructions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX variation_dc_idx ON variation (domain_config_id);
