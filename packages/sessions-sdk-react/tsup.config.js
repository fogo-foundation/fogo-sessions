/* eslint-disable n/no-process-env */
/* eslint-disable turbo/no-undeclared-env-vars */
import path from 'node:path';

import { preserveDirectivesPlugin } from 'esbuild-plugin-preserve-directives';
import { sassPlugin, postcssModules } from 'esbuild-sass-plugin';
import { defineConfig } from 'tsup';

const format = process.env.MODULE_FORMAT === 'esm' ? 'esm' : 'cjs';

export default defineConfig({
  clean: false,
  dts: true,
  watch: './src/**/*.{ts,tsx,scss}',
  format,
  esbuildPlugins: [
    sassPlugin({
    transform: postcssModules({})
  }),
  preserveDirectivesPlugin({
    directives: ['use client', 'use strict'],
    include: /\.(js|ts|jsx|tsx)$/,
    exclude: /node_modules/,
  }),],
  outDir: path.join(import.meta.dirname, 'dist', format),
  outExtension() {
    return format === 'esm' ? 'mjs' : 'cjs';
  },
  target: 'chrome110',
  tsconfig: path.join(import.meta.dirname, 'tsconfig.build.json'),
});
