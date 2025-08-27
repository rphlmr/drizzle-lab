import { schemaToSqlStatements } from "@drizzle-lab/api/pg";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { sql } from "drizzle-orm";
import type { Logger } from "drizzle-orm/logger";
import { drizzle } from "drizzle-orm/pglite";

import type { QueryLog } from "~/registry/utils/query-logger";

import * as $schema from "./schema";

class QueryLogger implements Logger {
  logQuery(sql: string, params: unknown[]): void {
    console.log({
      type: "query-log",
      sql,
      params,
    } satisfies QueryLog);
  }
}

export async function Database<TSchema extends Record<string, unknown> = Record<string, never>>(schema: TSchema) {
  const client = await PGlite.create({ extensions: { vector } });
  const db = drizzle({ client, schema, casing: "snake_case", logger: new QueryLogger() });

  for (const statement of schemaToSqlStatements(schema, { casing: "snake_case" })) {
    await db.execute(sql.raw(statement));
  }

  return db;
}

export const db = await Database($schema);
