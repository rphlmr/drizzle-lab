import { pgTable } from "drizzle-orm/pg-core";

import { playgroundColumns } from "~/database/shared";

/**
 * These schemas are used by PGLite in the browser (IndexedDB)
 */

/* -- Drizzle Run -- */
/* -- Playground -- */

const playground = pgTable("playground", {
  ...playgroundColumns,
});

export { playground };
