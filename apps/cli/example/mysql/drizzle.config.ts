/**
 * This is the configuration for the server-side database.
 */

import { defineConfig } from "drizzle-kit";

const base = "./example/mysql";

export default defineConfig({
  dialect: "mysql",
  dbCredentials: {
    url: process.env.ADMIN_DATABASE_URL!,
  },
  schema: `${base}/schema.ts`,
  out: `${base}/migrations`,
  verbose: false,
  schemaFilter: ["public"],
  casing: "snake_case",
  migrations: {
    prefix: "timestamp",
  },
});
