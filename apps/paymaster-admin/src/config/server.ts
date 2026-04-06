// Disable the following rule because this file is the intended place to declare
// and load all env variables.
/* eslint-disable n/no-process-env */

import "server-only";
import { env } from "node:process";

/**
 * Indicates that this server is the live user-facing production server.
 */
export const IS_PRODUCTION_SERVER = env.VERCEL_ENV === "production";
/**
 * Throw if the env var `key` is not set (at either runtime or build time).
 */
export const demand = (key: string): string => {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new MissingEnvironmentError(key);
  } else {
    return value;
  }
};

class MissingEnvironmentError extends Error {
  constructor(name: string) {
    super(`Missing environment variable: ${name}!`);
    this.name = "MissingEnvironmentError";
  }
}

const getEnvOrDefault = (key: string, defaultValue: string) =>
  env[key] ?? defaultValue;

const defaultInProduction = IS_PRODUCTION_SERVER
  ? getEnvOrDefault
  : (key: string) => env[key];

export const GOOGLE_ANALYTICS_ID = defaultInProduction(
  "GOOGLE_ANALYTICS_ID",
  "G-8SYVHSS051",
);

export const RPC = getEnvOrDefault("RPC", "https://testnet.fogo.io");
export const DOMAIN = getEnvOrDefault(
  "DOMAIN",
  "https://admin.dourolabs-paymaster.xyz",
);

export const DATABASE_URL = getEnvOrDefault(
  "DATABASE_URL",
  "postgres://paymaster:paymaster@localhost:5432/paymaster",
);
