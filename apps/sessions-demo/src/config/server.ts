/* eslint-disable n/no-process-env */

import "server-only";
import { Keypair } from "@solana/web3.js";
import { z } from "zod";

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

export const ADDRESS_LOOKUP_TABLE_ADDRESS = IS_DEV_MACHINE ?
  "93QGBU8ZHuvyKSvDFeETsdek1KQs4gqk3mEVKG8UxoX3": process.env.ADDRESS_LOOKUP_TABLE_ADDRESS;

export const SOLANA_RPC = defaultInDevelopment(
  "SOLANA_RPC",
  "http://127.0.0.1:8899",
);

const keySchema = z.array(z.number());

export const SPONSOR_KEY = Keypair.fromSecretKey(
  Uint8Array.from(
    keySchema.parse(
      JSON.parse(
        defaultInDevelopment(
          "SPONSOR_KEY",
          "[143,107,159,180,110,202,166,124,62,177,247,239,135,226,199,180,46,17,18,51,63,79,208,213,25,186,117,234,253,198,103,185,238,242,113,75,126,197,195,230,36,88,201,13,54,158,4,251,246,38,75,198,11,162,126,199,108,131,199,252,17,160,136,163]",
        ),
      ),
    ),
  ),
);
