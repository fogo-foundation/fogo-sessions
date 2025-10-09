import { base } from "@cprussin/eslint-config";

export default [
  ...base,
  {
    ignores: ["src/types/**", "src/idl/**"],
  },
];
