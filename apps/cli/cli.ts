/* eslint-disable no-console */
import { spawnSync } from "node:child_process";

import {
  DRIZZLE_LAB_ENV_KEY,
  importDrizzleConfig,
  DRIZZLE_LAB_TS_CONFIG_PATH,
} from "@drizzle-lab/api/config/node";
import { command, string, run, boolean, number } from "@drizzle-team/brocli";
import chalk from "chalk";

import pkg from "./package.json";

const optionConfig = string().desc("Path to drizzle config file").alias("c");
const debug = boolean().desc("Enable log output").default(false);
const tsConfig = string()
  .desc(
    "Path to tsconfig.json. It is used to resolve TypeScript paths aliases.",
  )
  .default(DRIZZLE_LAB_TS_CONFIG_PATH);

const visualizer = command({
  name: "visualizer",
  options: {
    config: optionConfig,
    debug,
    "save-dir": string()
      .desc("Directory to save the visualizer data")
      .default(".drizzle"),
    "project-id": string()
      .desc(
        "A unique identifier for the current visualized project. It is used as filename to save the visualizer state.",
      )
      .default("visualizer"),
    "ts-config": tsConfig,
    port: number().desc("Port to run visualizer on").default(64738).alias("p"),
  },
  async transform(options) {
    const DRIZZLE_LAB_CWD = process.cwd();

    const cliEnvs = {
      PORT: options.port ? String(options.port) : undefined,
      [DRIZZLE_LAB_ENV_KEY.DEBUG]: String(options.debug),
      [DRIZZLE_LAB_ENV_KEY.CONFIG_PATH]: options.config,
      [DRIZZLE_LAB_ENV_KEY.SAVE_DIR]: options["save-dir"],
      [DRIZZLE_LAB_ENV_KEY.PROJECT_ID]: options["project-id"],
      [DRIZZLE_LAB_ENV_KEY.CWD]: DRIZZLE_LAB_CWD,
      [DRIZZLE_LAB_ENV_KEY.TS_CONFIG_PATH]: options["ts-config"],
    } as const;

    process.env = {
      ...process.env,
      ...cliEnvs,
    };

    const config = await importDrizzleConfig(options.config);

    if (options.debug) {
      console.log("version", pkg.version);
      console.log("platform", process.platform);
      console.log("options", options);
      console.log("cli env", cliEnvs);

      if (
        config.lab?.projectId &&
        options["project-id"] &&
        options["project-id"] !== config.lab?.projectId
      ) {
        console.log(
          chalk.yellow(
            `\n"projectId" defined in config.lab (${config.lab?.projectId}) will be overridden by "--project-id" flag (${options["project-id"]})\n`,
          ),
        );
      }

      console.log("config", config);
    }

    return options;
  },
  async handler() {
    disclaimer();

    await assertOrmCoreVersion();

    process.env.NODE_ENV === "development"
      ? spawnSync("vite", ["--host"], {
          stdio: "inherit",
        })
      : spawnSync(process.execPath, ["visualizer/server/index.mjs"], {
          stdio: "inherit",
          cwd: import.meta.dirname,
          env: {
            ...process.env,
            NODE_ENV: "production",
          },
        });
  },
});

const snapshot = command({
  name: "snapshot",
  desc: "Generate the snapshot for the current schema",
  options: {
    config: optionConfig,
    debug,
    "ts-config": tsConfig,
  },
  transform: async (options) => {
    process.env[DRIZZLE_LAB_ENV_KEY.DEBUG] = String(options.debug);
    process.env[DRIZZLE_LAB_ENV_KEY.TS_CONFIG_PATH] = options["ts-config"];
    const config = await importDrizzleConfig(options.config);

    if (options.debug) {
      console.log("options", options);
      console.log("config", config);
    }

    return config;
  },
  async handler(config) {
    disclaimer();

    await assertOrmCoreVersion();

    let snapshot = {};

    switch (config.dialect) {
      case "postgresql": {
        const { importFromFiles, drizzleObjectsToSnapshot } = await import(
          "@drizzle-lab/api/pg/node"
        );
        const drizzleObjects = await importFromFiles(config.schema);
        snapshot = drizzleObjectsToSnapshot(drizzleObjects, config);
        break;
      }
      case "sqlite": {
        const { importFromFiles, drizzleObjectsToSnapshot } = await import(
          "@drizzle-lab/api/sqlite/node"
        );

        const drizzleObjects = await importFromFiles(config.schema);
        snapshot = drizzleObjectsToSnapshot(drizzleObjects, config);
        break;
      }
      case "mysql": {
        const { importFromFiles, drizzleObjectsToSnapshot } = await import(
          "@drizzle-lab/api/mysql/node"
        );

        const drizzleObjects = await importFromFiles(config.schema);
        snapshot = drizzleObjectsToSnapshot(drizzleObjects, config);
        break;
      }
    }

    console.log("\n");
    console.log(JSON.stringify(snapshot, null, 2));
  },
});

const sql = command({
  name: "sql",
  desc: "Generate the SQL for the current schema",
  options: {
    config: optionConfig,
    debug,
    "ts-config": tsConfig,
  },
  transform: async (options) => {
    process.env[DRIZZLE_LAB_ENV_KEY.DEBUG] = String(options.debug);
    process.env[DRIZZLE_LAB_ENV_KEY.TS_CONFIG_PATH] = options["ts-config"];
    const config = await importDrizzleConfig(options.config);

    if (options.debug) {
      console.log("options", options);
      console.log("config", config);
    }

    return config;
  },
  async handler(config) {
    disclaimer();

    await assertOrmCoreVersion();

    let sql = "";

    switch (config.dialect) {
      case "postgresql": {
        const { importFromFiles, drizzleObjectsToSql } = await import(
          "@drizzle-lab/api/pg/node"
        );
        const drizzleObjects = await importFromFiles(config.schema);
        sql = drizzleObjectsToSql(drizzleObjects, config);
        break;
      }
      case "sqlite": {
        const { importFromFiles, drizzleObjectsToSql } = await import(
          "@drizzle-lab/api/sqlite/node"
        );

        const drizzleObjects = await importFromFiles(config.schema);
        sql = drizzleObjectsToSql(drizzleObjects, config);
        break;
      }
      case "mysql": {
        const { importFromFiles, drizzleObjectsToSql } = await import(
          "@drizzle-lab/api/mysql/node"
        );

        const drizzleObjects = await importFromFiles(config.schema);
        sql = drizzleObjectsToSql(drizzleObjects, config);
        break;
      }
    }

    console.log("\n");
    console.log(sql);
  },
});

const generate = command({
  name: "generate",
  options: {
    config: optionConfig,
    debug,
  },
  subcommands: [snapshot, sql],
});

run([visualizer, generate], {
  name: "Drizzle Lab CLI",
  version: pkg.version,
});

function disclaimer() {
  console.log(
    chalk.yellow(
      `Drizzle Lab is a community-driven work in progress, and it is not guaranteed to work as expected.
If you want to help improve it, feel free to create an issue on GitHub: https://github.com/rphlmr/drizzle-lab/issues/new or reach out to me on Discord, X, or BlueSky at @rphlmr.`,
    ),
  );
}

async function assertOrmCoreVersion() {
  try {
    const { npmVersion } = await import("drizzle-orm/version");

    const [_major, minor, _patch] = npmVersion.split(".").map(Number);

    if (minor < 35) {
      console.log(
        "This version of drizzle-lab requires newer version of drizzle-orm\nPlease update drizzle-orm package to the latest version 👍",
      );
    }
  } catch (e) {
    console.error("Please install latest version of drizzle-orm");
    throw e;
  }
}
