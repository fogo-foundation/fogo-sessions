/* eslint-disable n/no-process-env */

import "server-only";

const IS_DEV_MACHINE = process.env.VERCEL_ENV === undefined;

function envOrThrow(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

const defaultInDevelopment = (name: string, devValue: string) =>
  IS_DEV_MACHINE ? (process.env[name] ?? devValue) : envOrThrow(name);

export const ADDRESS_LOOKUP_TABLE_ADDRESS = IS_DEV_MACHINE
  ? "93QGBU8ZHuvyKSvDFeETsdek1KQs4gqk3mEVKG8UxoX3"
  : process.env.ADDRESS_LOOKUP_TABLE_ADDRESS;

export const PAYMASTER_URL = IS_DEV_MACHINE
  ? "http://localhost:4000"
  : process.env.PAYMASTER_URL;

export const SOLANA_RPC = defaultInDevelopment(
  "SOLANA_RPC",
  "http://127.0.0.1:8899",
);

export const FOGO_SESSIONS_DOMAIN = process.env.FOGO_SESSIONS_DOMAIN;
