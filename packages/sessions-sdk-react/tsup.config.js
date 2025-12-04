/* eslint-disable n/no-process-env */
/* eslint-disable turbo/no-undeclared-env-vars */
import path from 'node:path';

import { sassPlugin } from 'esbuild-sass-plugin';
import { defineConfig } from 'tsup';

const format = process.env.MODULE_FORMAT === 'esm' ? 'esm' : 'cjs';

export default defineConfig({
  clean: false,
  dts: true,
  format,
  esbuildPlugins: [sassPlugin()],
  outDir: path.join(import.meta.dirname, 'dist', format),
  outExtension() {
    return format === 'esm' ? 'mjs' : 'cjs';
  },
  target: 'chrome110',
  tsconfig: path.join(import.meta.dirname, 'tsconfig.build.json'),
});
