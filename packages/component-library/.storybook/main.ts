import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import type { StorybookConfig } from "@storybook/nextjs";

const require = createRequire(import.meta.url);
const resolve = require.resolve;

type NormalModuleReplacementResource = {
  request: string;
  context: string;
};

type WebpackPluginInstanceLike = {
  // webpack plugin instances implement `apply(compiler)`.
  apply: (compiler: unknown) => void;
};

type WebpackWithNormalModuleReplacementPlugin = {
  NormalModuleReplacementPlugin: new (
    resourceRegExp: RegExp,
    newResource: (resource: NormalModuleReplacementResource) => void,
  ) => WebpackPluginInstanceLike;
};

// Storybook uses webpack internally; requiring avoids ESM/CJS interop issues.
const webpack =
  require("webpack") as unknown as WebpackWithNormalModuleReplacementPlugin;

const config = {
  framework: "@storybook/nextjs",

  stories: [
    "../src/**/*.mdx",
    "../src/**/?(*.)story.tsx",
    "../src/**/?(*.)stories.tsx",
  ],

  features: {
    backgrounds: true,
    measure: false,
  },

  addons: [
    "@storybook/addon-themes",
    {
      name: "@storybook/addon-styling-webpack",
      options: {
        rules: [
          {
            test: /\.s[ac]ss$/i,
            use: [
              "style-loader",
              {
                loader: "css-loader",
                options: {
                  modules: {
                    auto: true,
                    localIdentName: "[name]__[local]--[hash:base64:5]",
                    exportLocalsConvention: "as-is",
                  },
                  importLoaders: 1,
                  esModule: false,
                },
              },
              {
                loader: "sass-loader",
                options: { implementation: resolve("sass") },
              },
            ],
          },
        ],
      },
    },
  ],

  webpackFinal: (config) => {
    // Note that the logic below is a workaround to be able to run and build storybook with the components from the /src directory.
    // there are 2 particular cases
    // 1. we are importing the styles with .css extension, but the component has a matching .scss file in /src
    //  -> we need to replace the .css extension with .scss extension
    // 2. we are importing the components with .js extension, but the component has a matching .tsx or .ts file in /src
    //  -> we need to replace the .js extension with .tsx or .ts extension
    config.plugins ??= [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/\.css$/i, (resource) => {
        if (!resource.request.endsWith(".css")) return;

        const candidate = resource.request.replace(/\.css$/i, ".scss");
        const candidateAbs = path.resolve(resource.context, candidate);
        if (fs.existsSync(candidateAbs)) resource.request = candidate;
      }),
      new webpack.NormalModuleReplacementPlugin(/\.js$/i, (resource) => {
        if (!resource.request.endsWith(".js")) return;

        // .tsx first (most common), then .ts
        const candidates = [".tsx", ".ts"];
        for (const ext of candidates) {
          const candidate = resource.request.replace(/\.js$/i, ext);
          const candidateAbs = path.resolve(resource.context, candidate);
          if (fs.existsSync(candidateAbs)) {
            resource.request = candidate;
            return;
          }
        }
      }),
    );

    config.resolve = {
      ...config.resolve,
      extensionAlias: {
        ...config.resolve?.extensionAlias,
        ".js": [".js", ".ts"],
        ".jsx": [".jsx", ".tsx"],
      },
    };

    for (const rule of config.module?.rules ?? []) {
      if (
        typeof rule === "object" &&
        rule !== null &&
        rule.test instanceof RegExp &&
        rule.test.test(".svg")
      ) {
        rule.exclude = /\.svg$/i;
      }
    }

    config.module = {
      ...config.module,
      rules: [
        ...(config.module?.rules ?? []),
        {
          test: /\.svg$/i,
          use: ["@svgr/webpack"],
        },
      ],
    };

    return config;
  },
} satisfies StorybookConfig;
export default config;
