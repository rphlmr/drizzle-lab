import { splitSqlStatements } from "../../sql/utils";
import { importFromDatabase } from "../loader/database";

// fork: drizzle-kit/src/serializer/pgSerializer.ts

/**
 * Convert the schema SQL dump to a Drizzle snapshot
 *
 * **It requires `@electric-sql/pglite` and `@electric-sql/pglite/vector` to be installed**
 *
 * @param sqlDump - SQL dump
 * @returns Drizzle snapshot
 */
export async function sqlToSnapshot(sqlDump: string) {
  const [{ PGlite }, { vector }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite/vector"),
  ]).catch(() => {
    throw new Error(
      "Please install @electric-sql/pglite and @electric-sql/pglite/vector to use this feature",
    );
  });

  const client = await PGlite.create({
    extensions: { vector },
  });

  const statements = splitSqlStatements(sqlDump);
  for (const statement of statements) {
    await client.query(statement);
  }

  // Extract schemas from the SQL dump
  const schemaRegex = /CREATE SCHEMA (?:IF NOT EXISTS )?"?(\w+)"?/g;
  const schemas = [
    "public",
    ...new Set(Array.from(sqlDump.matchAll(schemaRegex), (m) => m[1])),
  ];

  return importFromDatabase(
    {
      query: async (sql, params) => {
        const res = await client.query(sql, params);
        return res.rows as any;
      },
    },
    schemas,
    {
      roles: {
        provider: "pglite",
      },
    },
  );
}
