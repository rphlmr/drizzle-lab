import { splitSqlStatements } from "../../sql/utils";
import { importFromDatabase } from "../loader/database";

// fork: drizzle-kit/src/serializer/sqliteSerializer.ts

/**
 * Convert the schema SQL dump to a Drizzle snapshot
 *
 * **It requires `@libsql/client-wasm` to be installed**
 *
 * @param sqlDump - SQL dump
 * @returns Drizzle snapshot
 */
export async function sqlToSnapshot(sqlDump: string) {
  const { createClient } = await import("@libsql/client-wasm").catch(() => {
    throw new Error("Please install @libsql/client-wasm to use this feature");
  });

  const client = createClient({ url: ":memory:" });

  const statements = splitSqlStatements(sqlDump);
  for (const statement of statements) {
    await client.execute(statement);
  }

  return importFromDatabase({
    query: async (sql, args = []) => {
      const res = await client.execute({ sql, args });
      return res.rows as any;
    },
  });
}
