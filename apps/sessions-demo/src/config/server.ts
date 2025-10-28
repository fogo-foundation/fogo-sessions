/* eslint-disable n/no-process-env */

import "server-only";
import { Network } from "@fogo/sessions-sdk-react";

const getNetwork = () => {
  switch (process.env.NETWORK) {
    case "testnet": {
      return Network.Testnet;
    }
    case "mainnet": {
      return Network.Mainnet;
    }
    default: {
      return;
    }
  }
};

export const NETWORK = getNetwork();

const ifLocalnet = (value: string) =>
  NETWORK === undefined ? value : undefined;

export const FAUCET_KEY =
  process.env.FAUCET_KEY ??
  ifLocalnet(
    "[156,172,157,152,254,131,214,144,112,176,48,254,231,131,231,245,253,166,29,34,62,108,57,5,90,112,56,190,248,162,193,216,37,30,112,184,13,184,180,63,215,19,244,249,200,64,62,242,252,197,243,232,246,17,16,154,188,86,89,208,205,56,234,17]",
  );

const getProviderConfig = () => {
  if (NETWORK === undefined) {
    return {
      addressLookupTableAddress:
        process.env.ADDRESS_LOOKUP_TABLE_ADDRESS ??
        "93QGBU8ZHuvyKSvDFeETsdek1KQs4gqk3mEVKG8UxoX3",
      domain: process.env.FOGO_SESSIONS_DOMAIN,
      rpc: process.env.RPC ?? "http://127.0.0.1:8899",
      paymaster: process.env.PAYMASTER ?? "http://localhost:4000",
    };
  } else if (
    process.env.PAYMASTER === undefined ||
    process.env.RPC === undefined
  ) {
    return {
      network: NETWORK,
      rpc: process.env.RPC,
      addressLookupTableAddress: process.env.ADDRESS_LOOKUP_TABLE_ADDRESS,
      domain:
        process.env.FOGO_SESSIONS_DOMAIN ?? "https://sessions-example.fogo.io",
    };
  } else {
    return {
      rpc: process.env.RPC,
      paymaster: process.env.PAYMASTER,
      addressLookupTableAddress: process.env.ADDRESS_LOOKUP_TABLE_ADDRESS,
      domain:
        process.env.FOGO_SESSIONS_DOMAIN ?? "https://sessions-example.fogo.io",
    };
  }
};

export const PROVIDER_CONFIG = getProviderConfig();
