/**
 * This is the configuration for the server-side database.
 */

import { defineConfig } from "drizzle-kit";

const base = "./example/sqlite";

export default defineConfig({
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.ADMIN_DATABASE_URL!,
  },
  schema: `${base}/schema.ts`,
  out: `${base}/migrations`,
  verbose: false,
  casing: "snake_case",
  migrations: {
    prefix: "timestamp",
  },
});
