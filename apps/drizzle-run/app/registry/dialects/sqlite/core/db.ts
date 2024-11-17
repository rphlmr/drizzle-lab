import { schemaToSqlStatements } from "@drizzle-lab/api/sqlite";
import { createClient } from "@libsql/client-wasm";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import type { Logger } from "drizzle-orm/logger";

import type { QueryLog } from "~/registry/utils/query-logger";

// eslint-disable-next-line import/namespace
import * as $schema from "./schema";

class QueryLogger implements Logger {
  logQuery(sql: string, params: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log({
      type: "query-log",
      sql,
      params,
    } satisfies QueryLog);
  }
}

export async function Database<TSchema extends Record<string, unknown> = Record<string, never>>(schema: TSchema) {
  const client = createClient({ url: ":memory:" });
  const db = drizzle({ client, schema, casing: "snake_case", logger: new QueryLogger() });

  for (const statement of schemaToSqlStatements(schema, { casing: "snake_case" })) {
    await db.run(sql.raw(statement));
  }
  return db;
}

export const db = await Database($schema);
