import "server-only";

/* eslint-disable n/no-process-env */
function envOrThrow(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

export const SOLANA_RPC = envOrThrow("NEXT_PUBLIC_SOLANA_RPC");
export const SPONSOR_KEY = envOrThrow("SPONSOR_KEY");
