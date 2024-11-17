/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@repo/eslint-config/base.js"],
  parserOptions: {
    project: true,
  },
  ignorePatterns: ["app/registry/*/presets", "**/*/_blank"],
};
