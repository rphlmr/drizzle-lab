/**
 * This is the configuration for the client-side database.
 */

import { defineConfig } from "drizzle-kit";

const base = "./app/database/.client";
const migrationsFolder = `${base}/migrations`;

export default defineConfig({
  dialect: "postgresql",
  schema: `${base}/schema.ts`,
  out: migrationsFolder,
  verbose: false,
});

export { migrationsFolder };
