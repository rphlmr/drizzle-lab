import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core/dialect";
import { drizzle } from "drizzle-orm/pglite";

import { env } from "~/utils/env";
import migrations from "./migrations/export.json";
import * as schema from "./schema";

const isDev = env.NODE_ENV === "development";

const dbName = isDev ? "drizzle-run-dev?v2" : "drizzle-run?v2";

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
    await new PgDialect().migrate(migrations, db._.session, dbName);
    isLocalDBSchemaSynced = true;
    console.info(`✅ Local database ready in ${performance.now() - start}ms`);
  } catch (cause) {
    console.error("❌ Local database schema migration failed", cause);
    throw cause;
  }
}

const localDb = Object.assign(db, {
  schema,
});

export { localDb };
