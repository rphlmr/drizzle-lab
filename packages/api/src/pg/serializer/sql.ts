import type { DrizzleObjects } from "./drizzle-objects";
import type { DrizzleSchema } from "../../internal/global";
import {
  prepareCreateEnumJson,
  prepareCreateIndPolicyJsons,
  prepareCreatePolicyJsons,
  prepareCreateReferencesJson,
  prepareCreateRoleJson,
  prepareCreateSchemasJson,
  prepareCreateSequenceJson,
  preparePgCreateIndexesJson,
  preparePgCreateTableJson,
  preparePgCreateViewJson,
  type JsonCreateEnumStatement,
  type JsonCreatePgViewStatement,
  type JsonCreatePolicyStatement,
  type JsonCreateReferenceStatement,
  type JsonCreateRoleStatement,
  type JsonCreateSchema,
  type JsonCreateSequenceStatement,
  type JsonCreateTableStatement,
  type JsonPgCreateIndexStatement,
  type JsonStatement,
} from "../../sql/create-statements";
import { generateSql } from "../../sql/generator";
import { PgSquasher, squashSnapshot, type Snapshot } from "../schema";
import { drizzleObjectsToSnapshot, schemaToSnapshot } from "./snapshot";
import type { PartialConfig } from "../../config/loader.node";

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
    dialect: "postgresql",
  });

  return snapshotToSql(snapshot);
}

/**
 * Convert snapshot to SQL statements
 * @param snapshot - Snapshot
 * @returns SQL statements
 */
export function snapshotToSqlStatements(snapshot: Snapshot) {
  const { sqlStatements } = generatePgSql(snapshot);

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
    dialect: "postgresql",
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
    dialect: "postgresql",
  });

  return snapshotToSql(snapshot);
}

const generatePgSql = (
  snapshot: Snapshot,
): {
  statements: JsonStatement[];
  sqlStatements: string[];
} => {
  const squashedSnapshot = squashSnapshot(snapshot);
  const schemas = Object.values(squashedSnapshot.schemas);
  const enums = Object.values(squashedSnapshot.enums);
  const sequences = Object.values(squashedSnapshot.sequences);
  const tables = Object.values(squashedSnapshot.tables);
  const views = Object.values(squashedSnapshot.views);
  const roles = Object.values(squashedSnapshot.roles);
  const individualPolicies = Object.values(squashedSnapshot.policies);
  const statements: JsonStatement[] = [];

  /* -------------------------------- Schemas; -------------------------------- */
  const createSchemas: JsonCreateSchema[] = prepareCreateSchemasJson(schemas);

  statements.push(...createSchemas);

  /* --------------------------------- Roles; --------------------------------- */
  const createRoles: JsonCreateRoleStatement[] = [];

  for (const role of roles) {
    createRoles.push(prepareCreateRoleJson(role));
  }

  statements.push(...createRoles);

  /* --------------------------------- Enums; --------------------------------- */
  const createEnums: JsonCreateEnumStatement[] = [];

  for (const en of enums) {
    createEnums.push(prepareCreateEnumJson(en.name, en.schema, en.values));
  }

  statements.push(...createEnums);

  /* ------------------------------- Sequences; ------------------------------- */
  const createSequences: JsonCreateSequenceStatement[] = [];

  for (const sequence of sequences) {
    createSequences.push(prepareCreateSequenceJson(sequence));
  }

  statements.push(...createSequences);

  /* --------------------------------- Tables; -------------------------------- */
  const createTables: JsonCreateTableStatement[] = [];
  // @rphlmr: I think this is not needed. Keeping just in case.
  // const addCompositePKs: JsonCreateCompositePK[] = [];
  const createReferences: JsonCreateReferenceStatement[] = [];
  const createIndexes: JsonPgCreateIndexStatement[] = [];
  const createPolicies: JsonCreatePolicyStatement[] = [];
  // const addUniqueConstraints: JsonCreateUniqueConstraint[] = [];

  for (const table of tables) {
    createTables.push(preparePgCreateTableJson(table, snapshot));

    // @rphlmr: I think this is not needed. Keeping just in case.
    // // composite primary keys
    // addCompositePKs.push(
    //   ...prepareAddCompositePrimaryKeyPg(
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
      ...preparePgCreateIndexesJson(
        table.name,
        table.schema,
        table.indexes,
        snapshot,
      ),
    );

    // policies
    createPolicies.push(
      ...prepareCreatePolicyJsons(
        table.name,
        table.schema,
        Object.values(table.policies).map(PgSquasher.unsquashPolicy),
      ),
    );

    // @rphlmr: I think this is not needed. Keeping just in case.
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
  // @rphlmr: I think this is not needed. Keeping just in case.
  // statements.push(...addCompositePKs);
  statements.push(...createReferences);
  statements.push(...createIndexes);
  statements.push(...createPolicies);
  // @rphlmr: I think this is not needed. Keeping just in case.
  // statements.push(...addUniqueConstraints);

  /* ------------------------------- Views; ------------------------------- */
  const createViews: JsonCreatePgViewStatement[] = [];

  for (const view of views) {
    createViews.push(
      preparePgCreateViewJson(
        view.name,
        view.schema,
        view.definition!,
        view.materialized,
        view.withNoData,
        view.with,
        view.using,
        view.tablespace,
      ),
    );
  }

  statements.push(...createViews);

  /* -------------------------------- Policies; ------------------------------- */
  statements.push(
    ...prepareCreateIndPolicyJsons(
      individualPolicies.map(({ values }) =>
        PgSquasher.unsquashPolicyPush(values),
      ),
    ),
  );

  /* -------------------------------- Compose; -------------------------------- */

  const sqlStatements = [...new Set(generateSql(statements, "postgresql"))];

  return {
    statements,
    sqlStatements,
  };
};
