import fs from "fs/promises";

import type { Options } from "tsup";
import { defineConfig } from "tsup";

await fs.rm("dist", { recursive: true }).catch(() => {});

const options: Options = {
  entry: ["src/index.ts"],
  outDir: "dist",
  clean: true,
  dts: true,
  sourcemap: false,
  minify: false,
};

export default defineConfig([
  {
    ...options,
    format: "esm",
  },
]);
