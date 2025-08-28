import * as fs from "node:fs/promises";

import { glob } from "glob";
import type { PackageJson } from "pkg-types";

import type { TypeFile } from "~/registry";

const registryRoot = "app/registry";
const appDir = process.cwd();
const distDir = "dist";
const manifestFileName = "manifest.json";
const typesToBundle = [
  "drizzle-orm",
  "drizzle-zod",
  "zod",
  "drizzle-valibot",
  "valibot",
  "drizzle-arktype",
  "arktype",
  "@ark/util",
  "@ark/schema",
  "drizzle-typebox",
  "@sinclair/typebox",
  "@electric-sql/pglite",
  "@libsql",
  "drizzle-seed",
] as const;

console.log("Building registry");

// Cleanup
await fs.rm(`${registryRoot}/${distDir}`, { recursive: true, force: true });

// build types
await fs.mkdir(`${registryRoot}/${distDir}`, { recursive: true });
const { version } = JSON.parse(
  await fs.readFile(`${appDir}/node_modules/drizzle-orm/package.json`, {
    encoding: "utf-8",
  })
) as PackageJson;

if (!version) {
  throw new Error("Drizzle-orm version not found");
}

await fs.writeFile(
  `${registryRoot}/${distDir}/${manifestFileName}`,
  JSON.stringify(
    {
      version,
      types: await bundleTypes(appDir),
    },
    null,
    0
  ),
  {
    flag: "w",
  }
);

console.log("Registry built");

async function bundleTypes(cwd: string) {
  return (
    await Promise.all(
      // Find their package.json and types declarations
      typesToBundle.map(async (dep) => {
        const ignorePattern: string[] = [];

        const filePaths = await glob(`node_modules/${dep}/**/{package.json,*.d.ts}`, {
          cwd,
          ignore: ignorePattern,
        });

        return (
          await Promise.all(
            filePaths.map(async (filePath) => {
              const content = await fs.readFile(`${cwd}/${filePath}`, {
                encoding: "utf-8",
              });

              return {
                filePath,
                content,
              } satisfies TypeFile;
            })
          )
        ).flat();
      })
    )
  )
    .flat()
    .filter(Boolean);
}
