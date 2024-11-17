import type { PartialConfig } from "../../config/loader.node";
import type { DrizzleSchema } from "../../internal/global";
import {
  prepareCreateIndexesJson,
  prepareSQLiteCreateTable,
  prepareSqliteCreateViewJson,
  type JsonCreateIndexStatement,
  type JsonCreateSqliteViewStatement,
  type JsonSqliteCreateTableStatement,
  type JsonStatement,
} from "../../sql/create-statements";
import { generateSql } from "../../sql/generator";
import { squashSnapshot } from "../schema";
import type { Snapshot, SnapshotSquashed } from "../schema";
import type { DrizzleObjects } from "./drizzle-objects";
import { drizzleObjectsToSnapshot, schemaToSnapshot } from "./snapshot";

/**
 * Convert Drizzle objects to SQL
 * @param drizzleObjects - Drizzle objects
 * @param config - Drizzle config
 * @returns SQL
 */
export function drizzleObjectsToSql(
  drizzleObjects: DrizzleObjects,
  config: PartialConfig = {},
) {
  const snapshot = drizzleObjectsToSnapshot(drizzleObjects, {
    ...config,
    dialect: "sqlite",
  });

  return snapshotToSql(snapshot);
}

/**
 * Convert snapshot to SQL statements
 * @param snapshot - Snapshot
 * @returns SQL statements
 */
export function snapshotToSqlStatements(snapshot: Snapshot) {
  const { sqlStatements } = generateSqliteSql(squashSnapshot(snapshot));

  return sqlStatements;
}

/**
 * Convert snapshot to SQL
 * @param snapshot - Snapshot
 * @returns SQL
 */
export function snapshotToSql(snapshot: Snapshot) {
  const sqlStatements = snapshotToSqlStatements(snapshot);

  return sqlStatements.join("\n");
}

/**
 * Convert schema to SQL statements
 * @param schema - Drizzle schema
 * @param config - Drizzle config
 * @returns SQL statements
 */
export function schemaToSqlStatements(
  schema: DrizzleSchema,
  config: PartialConfig = {},
) {
  const snapshot = schemaToSnapshot(schema, {
    ...config,
    dialect: "sqlite",
  });

  return snapshotToSqlStatements(snapshot);
}

/**
 * Convert schema to SQL
 * @param schema - Drizzle schema
 * @param config - Drizzle config
 * @returns SQL
 */
export function schemaToSql(schema: DrizzleSchema, config: PartialConfig = {}) {
  const snapshot = schemaToSnapshot(schema, {
    ...config,
    dialect: "sqlite",
  });

  return snapshotToSql(snapshot);
}

const generateSqliteSql = (
  squashedSnapshot: SnapshotSquashed,
): {
  statements: JsonStatement[];
  sqlStatements: string[];
} => {
  const tables = Object.values(squashedSnapshot.tables);
  const views = Object.values(squashedSnapshot.views);
  const statements: JsonStatement[] = [];

  /* --------------------------------- Tables; -------------------------------- */
  const createTables: JsonSqliteCreateTableStatement[] = [];
  const createIndexes: JsonCreateIndexStatement[] = [];

  for (const table of tables) {
    createTables.push(prepareSQLiteCreateTable(table));

    // indexes
    createIndexes.push(
      ...prepareCreateIndexesJson(table.name, "", table.indexes),
    );
  }

  statements.push(...createTables);
  statements.push(...createIndexes);

  /* --------------------------------- Views; -------------------------------- */
  const createViews: JsonCreateSqliteViewStatement[] = [];

  for (const view of views) {
    createViews.push(prepareSqliteCreateViewJson(view.name, view.definition!));
  }

  statements.push(...createViews);

  /* -------------------------------- Compose; -------------------------------- */

  const sqlStatements = [...new Set(generateSql(statements, "sqlite"))];

  return {
    statements,
    sqlStatements: sqlStatements,
  };
};
