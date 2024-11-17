import type { PartialConfig } from "../../config/loader.node";
import type { DrizzleSchema } from "../../internal/global";
import {
  prepareCreateIndexesJson,
  prepareCreateReferencesJson,
  prepareCreateSchemasJson,
  prepareMySqlCreateTableJson,
  prepareMySqlCreateViewJson,
  type JsonCreateIndexStatement,
  type JsonCreateMySqlViewStatement,
  type JsonCreateReferenceStatement,
  type JsonCreateSchema,
  type JsonCreateTableStatement,
  type JsonStatement,
} from "../../sql/create-statements";
import { generateSql } from "../../sql/generator";
import { squashSnapshot } from "../schema";
import type { Snapshot } from "../schema";
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
  const { sqlStatements } = generateMysqlSql(snapshot);

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

export const generateMysqlSql = (
  snapshot: Snapshot,
): {
  statements: JsonStatement[];
  sqlStatements: string[];
} => {
  const squashedSnapshot = squashSnapshot(snapshot);
  const schemas = Object.values(squashedSnapshot.schemas);
  const tables = Object.values(squashedSnapshot.tables);
  const views = Object.values(squashedSnapshot.views);
  const statements: JsonStatement[] = [];

  /* -------------------------------- Schemas; -------------------------------- */
  const createSchemas: JsonCreateSchema[] = prepareCreateSchemasJson(schemas);

  statements.push(...createSchemas);

  /* --------------------------------- Tables; -------------------------------- */
  const createTables: JsonCreateTableStatement[] = [];
  // const addCompositePKs: JsonCreateCompositePK[] = [];
  const createReferences: JsonCreateReferenceStatement[] = [];
  const createIndexes: JsonCreateIndexStatement[] = [];
  // const addUniqueConstraints: JsonCreateUniqueConstraint[] = [];

  for (const table of tables) {
    createTables.push(
      prepareMySqlCreateTableJson(table, snapshot, snapshot.internal),
    );

    // composite primary keys
    // addCompositePKs.push(
    //   ...prepareAddCompositePrimaryKeyMySql(
    //     table.name,
    //     table.schema,
    //     table.compositePrimaryKeys,
    //     jsonSchema,
    //   ),
    // );

    // references (foreign keys)
    createReferences.push(
      ...prepareCreateReferencesJson(
        table.name,
        table.schema,
        table.foreignKeys,
      ),
    );

    // indexes
    createIndexes.push(
      ...prepareCreateIndexesJson(
        table.name,
        table.schema,
        table.indexes,
        snapshot.internal,
      ),
    );

    // unique constraints
    // addUniqueConstraints.push(
    //   ...prepareAddUniqueConstraint(
    //     table.name,
    //     table.schema,
    //     table.uniqueConstraints,
    //   ),
    // );
  }

  statements.push(...createTables);
  // statements.push(...addCompositePKs);
  statements.push(...createReferences);
  statements.push(...createIndexes);
  // statements.push(...addUniqueConstraints);

  /* --------------------------------- Views; -------------------------------- */
  const createViews: JsonCreateMySqlViewStatement[] = [];

  for (const view of views) {
    createViews.push(
      prepareMySqlCreateViewJson(
        view.name,
        view.schema,
        view.definition!,
        view.meta,
      ),
    );
  }

  statements.push(...createViews);

  /* -------------------------------- Compose; -------------------------------- */

  const sqlStatements = [...new Set(generateSql(statements, "mysql"))];

  return {
    statements,
    sqlStatements,
  };
};
