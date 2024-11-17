/**
 * This is the configuration for the server-side database.
 */

import { defineConfig } from "drizzle-kit";

const base = "./app/database/.server";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_MIGRATE!,
  },
  schema: [`${base}/schema.ts`, `${base}/relations.ts`],
  out: `${base}/migrations`,
  verbose: false,
});
