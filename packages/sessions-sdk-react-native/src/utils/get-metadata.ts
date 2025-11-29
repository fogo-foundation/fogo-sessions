import { z } from 'zod';

// React Native provides fetch globally
// For Node.js environments (like testing), we conditionally polyfill
declare const globalThis: {
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  fetch?: typeof fetch;
};

if (globalThis.fetch === undefined) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, unicorn/prefer-module, n/no-extraneous-require
    const nodeFetch = require('node-fetch');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-nullish-coalescing
    globalThis.fetch = nodeFetch.default || nodeFetch;
  } catch {
    // Ignore if node-fetch is not available
  }
}

export const getMetadata = async (mints: string[]) => {
  const metadataUrl = new URL('https://www.fogo.io/api/token-metadata');
  for (const mint of mints) {
    metadataUrl.searchParams.append('mint[]', mint);
  }
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const metadataResult = await fetch(metadataUrl);
  return metadataSchema.parse(await metadataResult.json());
};

const metadataSchema = z.record(
  z.string(),
  z.object({
    name: z.string(),
    symbol: z.string(),
    image: z.string(),
  })
);
