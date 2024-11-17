import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";

import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import type { RollupOptions } from "rollup";
import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";

import pkg from "./package.json";

const config = {
  input: "./cli.ts",
  output: {
    dir: "dist",
    format: "esm",
  },
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      browser: false,
      exportConditions: ["node"],
    }),
    commonjs({
      extensions: [".js"],
      sourceMap: false,
      strictRequires: "auto",
      defaultIsModuleExports: true,
    }),
    esbuild({
      platform: "node",
      tsconfig: "./tsconfig.build.json",
      target: "node20",
    }),
    json(),
  ],
} satisfies RollupOptions;

// Build with rollup
const bundle = await rollup(config);
await bundle.write(config.output);
await bundle.close();

// Add banner to dist/cli.js
const banner = `#!/usr/bin/env node\n`;
const cliFilePath = "dist/cli.js";
const originalContent = await fs.readFile(cliFilePath, "utf-8");
await fs.writeFile(cliFilePath, banner + originalContent);

// chmod +x dist/cli.js
await fs.chmod(cliFilePath, "755");

// build visualizer app
spawnSync("remix", ["vite:build"], {
  stdio: "inherit",
});

const updatedPkg = {
  ...pkg,
  scripts: undefined,
  dependencies: undefined,
  devDependencies: undefined,
};

await fs.writeFile("dist/package.json", JSON.stringify(updatedPkg, null, 2));

await fs.copyFile("LICENSE", "dist/LICENSE");
await fs.copyFile("README.md", "dist/README.md");
