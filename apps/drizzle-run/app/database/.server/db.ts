import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/utils/env";

import * as relations from "./relations";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL, { prepare: false, max: 10 });

const db = drizzle({
  client,
  schema: {
    ...schema,
    ...relations,
  },
  casing: "snake_case",
  logger: env.NODE_ENV === "development",
});

const serverDb = Object.assign(db, {
  schema,
});

export { serverDb };
