/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@repo/eslint-config/base.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  plugins: ["@repo/eslint-plugin-node-imports"],
  rules: {
    "no-console": "off",
    "no-useless-escape": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@repo/eslint-plugin-node-imports/no-node-imports": "error",
  },
  ignorePatterns: ["*.config.ts"],
};
