import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import chalk from "chalk";
import { config } from "dotenv";
import { createJiti } from "jiti";

import { getEnv } from "../config/env.node.ts";

const jiti = createJiti(import.meta.url, {
  alias: loadTsConfigPathsAlias(getEnv().DRIZZLE_LAB_CWD),
  moduleCache: false,
});

let warned = false;

/**
 * Import a module from path, like a `import x from 'module'` or `require('module')`
 * @param path - path to module
 * @node-only - This function is not supported in the browser.
 */
export async function importModule(path: string) {
  if (getEnv().DRIZZLE_LAB_DEBUG) {
    console.log("[importModule] Importing module", path);
  }

  try {
    if (getEnv().DRIZZLE_LAB_ENV_FILE_PATH) {
      config({ path: getEnv().DRIZZLE_LAB_ENV_FILE_PATH });
    }

    let module = await jiti.import<{ default: { default?: any } }>(
      pathToFileURL(path).href,
    );

    // handle nested module default when used in a commonjs project
    if (module?.default?.default) {
      if (!warned) {
        console.warn(
          chalk.yellow(
            "\nCommonJS project type detected. You should try to migrate to ESM project type. Support for CommonJS will be dropped in the future.\n",
          ),
        );
        warned = true;
      }

      module = {
        ...module,
        default: module.default.default,
      };
    }

    return module;
  } catch (e) {
    if (getEnv().DRIZZLE_LAB_DEBUG) {
      console.error(
        "[importModule] Failed to import module",
        path,
        (e as Error).message,
      );
    }
    throw e;
  }
}

function loadTsConfigPathsAlias(cwd: string) {
  try {
    const tsconfigPath = path.resolve(cwd, getEnv().DRIZZLE_LAB_TS_CONFIG_PATH);
    let rawImport = fs.readFileSync(tsconfigPath, "utf8");
    // Remove single-line comments
    rawImport = rawImport.replace(/\/\/.*$/gm, "");
    // Remove multi-line comments while preserving paths
    rawImport = rawImport.replace(
      /\/\*(?![^"]*"[^"]*(?:"[^"]*"[^"]*)*$)[\s\S]*?\*\//g,
      "",
    );
    const config = JSON.parse(rawImport) as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    const paths = config.compilerOptions?.paths || {};
    const alias = Object.entries(paths).reduce((acc, [key, value]) => {
      // we need to remove the * from the key and value because Jiti checks with startsWith
      const sanitizedKey = key.replace("*", "");
      const sanitizedValue = value[0].replace("*", "");
      acc[sanitizedKey] = path.resolve(cwd, sanitizedValue);
      return acc;
    }, {});

    if (getEnv().DRIZZLE_LAB_DEBUG) {
      console.log("[tsconfig] Loading tsConfig path", tsconfigPath);
      console.log("[tsconfig] Loaded tsConfig", rawImport);
      console.log("[tsconfig] TS alias", alias);
    }

    return alias;
  } catch (e) {
    console.error(`\nFailed to load tsconfig: ${(e as Error).message}`);
    return {};
  }
}
