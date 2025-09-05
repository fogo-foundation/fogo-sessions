/* eslint-disable n/no-process-env */

import "server-only";

const IS_DEV_MACHINE = process.env.VERCEL_ENV === undefined;

const envWithDefaults = <
  D extends string | undefined,
  P extends string | undefined,
>(
  name: string,
  defaults: { localnet: D; testnet: P },
) => {
  const valueFromEnv = process.env[name];
  if (valueFromEnv === undefined) {
    return IS_DEV_MACHINE && process.env.USE_TESTNET === undefined
      ? defaults.localnet
      : defaults.testnet;
  } else {
    return valueFromEnv;
  }
};

export const ADDRESS_LOOKUP_TABLE_ADDRESS = envWithDefaults(
  "ADDRESS_LOOKUP_TABLE_ADDRESS",
  {
    localnet: "93QGBU8ZHuvyKSvDFeETsdek1KQs4gqk3mEVKG8UxoX3",
    testnet: undefined,
  },
);

export const PAYMASTER = envWithDefaults("PAYMASTER", {
  localnet: "http://localhost:4000",
  testnet: undefined,
});

export const RPC = envWithDefaults("RPC", {
  localnet: "http://127.0.0.1:8899",
  testnet: "https://testnet.fogo.io",
});

export const FOGO_SESSIONS_DOMAIN = envWithDefaults("FOGO_SESSIONS_DOMAIN", {
  localnet: undefined,
  testnet: "https://sessions-example.fogo.io"
});

export const FAUCET_KEY = envWithDefaults("FAUCET_KEY", {
  localnet:
    "[156,172,157,152,254,131,214,144,112,176,48,254,231,131,231,245,253,166,29,34,62,108,57,5,90,112,56,190,248,162,193,216,37,30,112,184,13,184,180,63,215,19,244,249,200,64,62,242,252,197,243,232,246,17,16,154,188,86,89,208,205,56,234,17]",
  testnet: undefined,
});
