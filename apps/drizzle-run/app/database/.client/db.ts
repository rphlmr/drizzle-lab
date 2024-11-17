import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core/dialect";
import { drizzle, type PgliteClient } from "drizzle-orm/pglite";

import { env } from "~/utils/env";

import migrations from "./migrations/export.json";
import * as schema from "./schema";
import type { Playground } from "../types";

const isDev = env.NODE_ENV === "development";
const migrationStorageKey = "migration.playgrounds";

// handle versioning on PGlite breaking changes
const dbName_v1 = isDev ? "drizzle-run-dev" : "drizzle-run";
const dbName = isDev ? "drizzle-run-dev?v2" : "drizzle-run?v2";
const previousDBs = [{ v: 1, name: dbName_v1 }] as const;

// check if we have a previous version of PGlite indexedDB and get the oldest one
const previousDBToMigrate = await indexedDB.databases().then((databases) =>
  databases.reduce<(typeof previousDBs)[number] | undefined>((result, it) => {
    if (result) {
      return result;
    }
    return previousDBs.find((db) => it.name?.endsWith(db.name));
  }, undefined),
);

// if we have a previous version of PGlite, we need to backup the playgrounds
if (previousDBToMigrate) {
  let previousClient: PgliteClient;

  // lazy load the previous version of PGlite
  switch (previousDBToMigrate.v) {
    case 1: {
      const { PGlite: PGliteV1 } = await import("@electric-sql/pglite-v1");
      previousClient = new PGliteV1(
        `idb://${previousDBToMigrate.name}`,
      ) as unknown as PgliteClient;
      break;
    }
  }

  await previousClient.waitReady;

  const db = drizzle({
    client: previousClient,
    schema,
    casing: "snake_case",
    logger: isDev,
  });

  const playgroundsToMigrate = await db.query.playground.findMany();

  localStorage.setItem(
    migrationStorageKey,
    JSON.stringify(playgroundsToMigrate),
  );

  console.warn(
    `Found ${playgroundsToMigrate.length} playgrounds to migrate from an old version of PGlite.\nBacking up to localStorage in ${migrationStorageKey}`,
    playgroundsToMigrate,
  );

  // close client to prevent memory leak
  previousClient.close();
}

// create the new local db if not already created
const client = await PGlite.create({ dataDir: `idb://${dbName}` });
const db = drizzle({
  client,
  schema,
  logger: isDev,
});

// prevent multiple schema migrations to be run
let isLocalDBSchemaSynced = false;

if (!isLocalDBSchemaSynced) {
  const start = performance.now();
  try {
    // @ts-expect-error 🤷 don't know why db._.session is not a Session
    await new PgDialect().migrate(migrations, db._.session, dbName_v1);
    isLocalDBSchemaSynced = true;
    console.info(`✅ Local database ready in ${performance.now() - start}ms`);
  } catch (cause) {
    console.error("❌ Local database schema migration failed", cause);
    throw cause;
  }
}

if (previousDBToMigrate) {
  const playgroundsToMigrate: Playground[] = [];

  try {
    playgroundsToMigrate.push(
      ...(JSON.parse(
        localStorage.getItem(migrationStorageKey) || "[]",
      ) as Playground[]),
    );
  } catch (cause) {
    console.error("❌ Failed to parse migration data", cause);
    throw cause;
  }

  try {
    if (playgroundsToMigrate.length > 0) {
      await db
        .insert(schema.playground)
        .values(playgroundsToMigrate)
        .onConflictDoNothing();
    }

    // attempt to delete the previous db
    await new Promise((resolve) => {
      const event = indexedDB.deleteDatabase(
        `/pglite/${previousDBToMigrate.name}`,
      );
      event.onsuccess = () => {
        resolve(null);
      };
      event.onerror = (ev) => {
        console.error("Was not able to delete previous db", ev);
        resolve(null);
      };
    });

    localStorage.removeItem(migrationStorageKey);
  } catch (cause) {
    console.error("❌ Local database migration failed", cause);
    throw cause;
  }
}

const localDb = Object.assign(db, {
  schema,
});

export { localDb };
