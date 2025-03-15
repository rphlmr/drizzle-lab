/**
 * This script is run before install
 *
 * It installs dependencies for internal packages that are linked (tsconfig.json > paths) to this package
 */

import { execSync } from "node:child_process";

import tsConfig from "./tsconfig.json" with { type: "json" };

const install = process.env.CI ? "npm ci --include=dev" : "npm install";

console.log(`\n⏳ Installing root dependencies with ${install}`);
execSync(`cd ../.. && ${install}`, { stdio: "inherit" });
console.log("\n✅ Finished installing root dependencies");

const internalDependenciesRoot = Object.entries(tsConfig.compilerOptions.paths)
  .filter(([key]) => key.startsWith("@"))
  .flatMap(([, value]) => value[0].split("/src")[0]);

for (const dependency of internalDependenciesRoot) {
  console.log(`\n⏳ Installing dependencies for ${dependency} with ${install}`);
  execSync(`cd ${dependency} && ${install}`, { stdio: "inherit" });
  console.log(`\n✅ Finished installing dependencies for ${dependency}`);
}
