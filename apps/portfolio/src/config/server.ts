// Disable the following rule because this file is the intended place to declare
// and load all env variables.
/* eslint-disable n/no-process-env */

import "server-only";

/**
 * Indicates that this server is the live user-facing production server.
 */
export const IS_PRODUCTION_SERVER = process.env.VERCEL_ENV === "production";

const getEnvOrDefault = (key: string, defaultValue: string) =>
  process.env[key] ?? defaultValue;

const defaultInProduction = IS_PRODUCTION_SERVER
  ? getEnvOrDefault
  : (key: string) => process.env[key];

export const GOOGLE_ANALYTICS_ID = defaultInProduction(
  "GOOGLE_ANALYTICS_ID",
  "G-8SYVHSS051",
);

export const ENABLE_ACCESSIBILITY_REPORTING =
  !IS_PRODUCTION_SERVER && !process.env.DISABLE_ACCESSIBILITY_REPORTING;

export const RPC = getEnvOrDefault("RPC", "https://testnet.fogo.io");

// TODO Replace this domain with https://portfolio.fogo.io after setting up a
// new paymaster for it
export const DOMAIN = getEnvOrDefault(
  "DOMAIN",
  "https://sessions-example.fogo.io",
);
