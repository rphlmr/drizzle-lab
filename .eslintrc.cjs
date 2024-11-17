// This configuration only applies to the package manager root.
/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./shared/eslint-config/base.js"],
  ignorePatterns: ["apps/**", "packages/**", "shared/**"],
};
