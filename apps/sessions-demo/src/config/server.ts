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

export const FOGO_SESSIONS_DOMAIN = process.env.FOGO_SESSIONS_DOMAIN;
