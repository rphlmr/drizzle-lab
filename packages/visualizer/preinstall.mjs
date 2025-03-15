/**
 * This script is run before install
 *
 * It installs dependencies for internal packages that are linked (tsconfig.json > paths) to this package
 */

import { execSync } from "node:child_process";

import tsConfig from "./tsconfig.json" with { type: "json" };

const internalDependenciesRoot = Object.entries(tsConfig.compilerOptions.paths)
  .filter(([key]) => key.startsWith("@"))
  .flatMap(([, value]) => value[0].split("/src")[0]);

for (const dependency of internalDependenciesRoot) {
  console.log(`\n⏳ Installing dependencies for ${dependency}`);
  execSync(`cd ${dependency} && npm install`, { stdio: "inherit" });
  console.log(`\n✅ Finished installing dependencies for ${dependency}`);
}
