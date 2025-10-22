import { react } from "@cprussin/eslint-config";

export default [
  ...react,
  {
    ignores: [
      "lib/**/*",
      "node_modules/**/*",
      "*.js",
      "**/*.js",
      "scripts/**",
      "**/*.html",
      "**/*.json",
      "dist/**/*",
      "build/**/*",
      "src/__tests__/**/*"
    ]
  },
  {
    rules: {
      "import/namespace": "off"
    }
  }
];
