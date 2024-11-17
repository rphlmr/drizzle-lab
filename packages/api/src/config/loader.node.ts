import fs from "node:fs";
import Path from "node:path";

import { glob } from "glob";

import {
  DRIZZLE_LAB_CWD,
  DRIZZLE_LAB_DEBUG,
  DRIZZLE_LAB_PROJECT_ID,
} from "./env.node.ts";
import { configCommonSchema } from "./schema.ts";
import { importModule } from "../internal/import-module.node.ts";
import { withStyle } from "../internal/style";

export type Config = Awaited<ReturnType<typeof importDrizzleConfig>>;
export type PartialConfig = Partial<Config>;

/**
 * Import the Drizzle config file
 * @param configPath - The path to the config file.
 * @returns The Drizzle config
 */
export async function importDrizzleConfig(configPath?: string) {
  const defaultTsConfigExists = fs.existsSync(
    Path.resolve(Path.join(DRIZZLE_LAB_CWD, "drizzle.config.ts")),
  );
  const defaultJsConfigExists = fs.existsSync(
    Path.resolve(Path.join(DRIZZLE_LAB_CWD, "drizzle.config.js")),
  );

  const defaultConfigPath = defaultTsConfigExists
    ? "drizzle.config.ts"
    : defaultJsConfigExists
      ? "drizzle.config.js"
      : "drizzle.config.json";

  if (DRIZZLE_LAB_DEBUG && !configPath) {
    console.info(
      withStyle.info(
        `No config path provided, using default '${defaultConfigPath}'`,
      ),
    );
  }

  const path = Path.resolve(
    Path.join(DRIZZLE_LAB_CWD, configPath ?? defaultConfigPath),
  );

  if (!fs.existsSync(path)) {
    console.error(withStyle.error(`${path} file does not exist`));
    throw new Error();
  }

  if (DRIZZLE_LAB_DEBUG) {
    console.info(withStyle.info(`Reading config file '${path}'`));
  }

  const module = await importModule(path);
  const content = module.default;

  // --- get response and then check by each dialect independently
  const config = configCommonSchema.safeParse(content);

  if (!config.success) {
    console.error(config.error);
    throw new Error(config.error.message);
  }

  return {
    ...config.data,
    schema: prepareFilenames(config.data.schema),
    projectId: config.data.lab.projectId || DRIZZLE_LAB_PROJECT_ID,
  };
}

const prepareFilenames = (paths: string[]) => {
  const matches = paths.reduce((matches, cur) => {
    const globMatches = glob.sync(`${DRIZZLE_LAB_CWD}${cur}`);

    globMatches.forEach((it) => {
      const fileName = fs.lstatSync(it).isDirectory() ? null : Path.resolve(it);

      const filenames = fileName
        ? [fileName]
        : fs.readdirSync(it).map((file) => Path.join(Path.resolve(it), file));

      filenames
        .filter((file) => !fs.lstatSync(file).isDirectory())
        .forEach((file) => matches.add(file));
    });

    return matches;
  }, new Set<string>());

  // when schema: "./schema" and not "./schema.ts"
  if (matches.size === 0) {
    console.info(
      withStyle.error(
        `No schema files found for path config [${paths
          .map((it) => `'${it}'`)
          .join(", ")}]`,
      ),
    );
    console.error(
      withStyle.error(
        `If path represents a file - please make sure to use .ts or other extension in the path`,
      ),
    );
    throw new Error("No schema files found");
  }

  return [...matches];
};
