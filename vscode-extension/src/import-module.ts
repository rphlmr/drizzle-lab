import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";

import { createLogger } from "./utils";

const logger = createLogger("import-module");

/**
 * Import a module from path, like a `import x from 'module'` or `require('module')`
 * @param path - path to module
 * @node-only - This function is not supported in the browser.
 */
export async function importModule<T>({ path, envFilePath }: { path: string; envFilePath?: string }, cwd: string) {
  const jiti = createJiti(__dirname, {
    alias: loadTsConfigPathsAlias(cwd),
    moduleCache: false,
  });

  try {
    if (envFilePath) {
      logger.info(`Loading env file: ${envFilePath}`);
      const { config } = await import("dotenv");
      config({ path: envFilePath });
    }

    logger.info(`Module: ${path} | cwd: ${cwd}`);

    let module = await jiti.import<{ default: { default?: T } & T }>(pathToFileURL(path).href);

    // handle nested module default when used in a commonjs project
    if (module?.default?.default) {
      logger.warn(
        "CommonJS project type detected. You should try to migrate to ESM project type. Support for CommonJS will be dropped in the future."
      );

      module = {
        ...module,
        default: module.default.default,
      };
    }

    return module;
  } catch (e) {
    const msg = `Failed to import module at ${path}: ${e instanceof Error ? e.message : String(e)}`;
    logger.error(msg);
    throw new Error(msg);
  }
}

function loadTsConfigPathsAlias(cwd: string) {
  try {
    const tsconfigPath = path.resolve(cwd, "tsconfig.json");
    let rawImport = fs.readFileSync(tsconfigPath, "utf8");
    // Remove single-line comments
    rawImport = rawImport.replace(/\/\/.*$/gm, "");
    // Remove multi-line comments while preserving paths
    rawImport = rawImport.replace(/\/\*(?![^"]*"[^"]*(?:"[^"]*"[^"]*)*$)[\s\S]*?\*\//g, "");
    const config = JSON.parse(rawImport) as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    const paths = config.compilerOptions?.paths || {};
    const alias = Object.entries(paths).reduce(
      (acc, [key, value]) => {
        // we need to remove the * from the key and value because Jiti checks with startsWith
        const sanitizedKey = key.replace("*", "");
        const sanitizedValue = value[0].replace("*", "");
        acc[sanitizedKey] = path.resolve(cwd, sanitizedValue);
        return acc;
      },
      {} as Record<string, string>
    );

    return alias;
  } catch (e) {
    console.error(`\nFailed to load tsconfig: ${(e as Error).message}`);
    return {};
  }
}
