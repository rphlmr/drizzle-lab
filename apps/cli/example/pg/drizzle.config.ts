/**
 * This is the configuration for the server-side database.
 */

import { defineConfig } from "drizzle-kit";

const base = "./example/pg";

export default defineConfig({
  dialect: "postgresql",
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
  entities: {
    roles: {
      provider: "supabase",
      exclude: ["supabase_auth_admin"],
    },
  },
});
