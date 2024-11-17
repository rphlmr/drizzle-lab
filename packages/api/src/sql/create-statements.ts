import {
  object,
  string,
  boolean,
  any,
  enum as enumType,
  type TypeOf,
} from "zod";

import {
  type MySqlKitInternals,
  MySqlSquasher,
  type TableSquashed as MySqlTable,
  type View as MySqlView,
  type Snapshot as MySqlSnapshot,
} from "../mysql/schema";
import {
  type SequenceSquashed as PgSequence,
  type TableSquashed as PgTable,
  type Index as PgIndex,
  PgSquasher,
  type View as PgView,
  type Policy,
  type Role,
  type Snapshot as PgSnapshot,
} from "../pg/schema";
import {
  type Column as SQLiteColumn,
  type TableSquashed as SQLiteTable,
  type SQLiteKitInternals,
  SQLiteSquasher,
  type View as SQLiteView,
} from "../sqlite/schema";

// fork: drizzle-kit/src/jsonStatements.ts

const columnSchema = object({
  name: string(),
  type: string(),
  typeSchema: string().optional(),
  primaryKey: boolean().optional(),
  default: any().optional(),
  notNull: boolean().optional(),
  // should it be optional? should if be here?
  autoincrement: boolean().optional(),
  onUpdate: boolean().optional(),
  isUnique: any().optional(),
  uniqueName: string().optional(),
  nullsNotDistinct: boolean().optional(),
  generated: object({
    as: string(),
    type: enumType(["stored", "virtual"]).default("stored"),
  }).optional(),
  identity: string().optional(),
}).strict();

type Column = TypeOf<typeof columnSchema>;

export interface JsonSqliteCreateTableStatement {
  type: "sqlite_create_table";
  tableName: string;
  columns: SQLiteColumn[];
  referenceData: {
    name: string;
    tableFrom: string;
    columnsFrom: string[];
    tableTo: string;
    columnsTo: string[];
    onUpdate?: string | undefined;
    onDelete?: string | undefined;
  }[];
  compositePKs: string[][];
  uniqueConstraints?: string[];
  checkConstraints?: string[];
}

export interface JsonCreateTableStatement {
  type: "create_table";
  tableName: string;
  schema: string;
  columns: Column[];
  compositePKs: string[];
  compositePkName?: string;
  uniqueConstraints?: string[];
  policies?: string[];
  checkConstraints?: string[];
  internals?: MySqlKitInternals;
  isRLSEnabled?: boolean;
}

export interface JsonCreateEnumStatement {
  type: "create_type_enum";
  name: string;
  schema: string;
  values: string[];
}

export interface JsonCreateRoleStatement {
  type: "create_role";
  name: string;
  values: {
    inherit?: boolean;
    createDb?: boolean;
    createRole?: boolean;
  };
}

export interface JsonCreatePolicyStatement {
  type: "create_policy";
  tableName: string;
  data: Policy;
  schema: string;
}

export interface JsonCreateIndPolicyStatement {
  type: "create_ind_policy";
  tableName: string;
  data: Policy;
}

export interface JsonEnableRLSStatement {
  type: "enable_rls";
  tableName: string;
  schema: string;
}

export interface JsonCreateSequenceStatement {
  type: "create_sequence";
  name: string;
  schema: string;
  values: {
    increment?: string | undefined;
    minValue?: string | undefined;
    maxValue?: string | undefined;
    startWith?: string | undefined;
    cache?: string | undefined;
    cycle?: boolean | undefined;
  };
}

export interface JsonCreateIndexStatement {
  type: "create_index";
  tableName: string;
  data: string;
  schema: string;
  // internal?: MySqlKitInternals | SQLiteKitInternals;
  internal?: SQLiteKitInternals;
}

export interface JsonPgCreateIndexStatement {
  type: "create_index_pg";
  tableName: string;
  data: PgIndex;
  schema: string;
}

export interface JsonReferenceStatement {
  type: "create_reference" | "alter_reference" | "delete_reference";
  data: string;
  schema: string;
  tableName: string;
  //   fromTable: string;
  //   fromColumns: string[];
  //   toTable: string;
  //   toColumns: string[];
  //   foreignKeyName: string;
  //   onDelete?: string;
  //   onUpdate?: string;
}

export interface JsonCreateUniqueConstraint {
  type: "create_unique_constraint";
  tableName: string;
  data: string;
  schema?: string;
  constraintName?: string;
}

export interface JsonCreateCompositePK {
  type: "create_composite_pk";
  tableName: string;
  data: string;
  schema?: string;
  constraintName?: string;
}

export interface JsonCreateReferenceStatement extends JsonReferenceStatement {
  type: "create_reference";
}

export interface JsonCreateSchema {
  type: "create_schema";
  name: string;
}

export type JsonCreatePgViewStatement = {
  type: "create_view";
} & Omit<PgView, "columns" | "isExisting">;

export type JsonCreateMySqlViewStatement = {
  type: "mysql_create_view";
  replace: boolean;
} & Omit<MySqlView, "columns" | "isExisting">;

export type JsonCreateSqliteViewStatement = {
  type: "sqlite_create_view";
} & Omit<SQLiteView, "columns" | "isExisting">;

export type JsonStatement =
  | JsonCreateTableStatement
  | JsonCreateEnumStatement
  | JsonCreateRoleStatement
  | JsonCreatePolicyStatement
  | JsonCreateIndPolicyStatement
  | JsonEnableRLSStatement
  | JsonCreateIndexStatement
  | JsonCreateReferenceStatement
  | JsonReferenceStatement
  | JsonSqliteCreateTableStatement
  | JsonCreateCompositePK
  | JsonCreateUniqueConstraint
  | JsonCreateSchema
  | JsonPgCreateIndexStatement
  | JsonCreateSequenceStatement
  | JsonCreatePgViewStatement
  | JsonCreateMySqlViewStatement
  | JsonCreateSqliteViewStatement;

export const preparePgCreateTableJson = (
  table: PgTable,
  // TODO: remove?
  snapshot: PgSnapshot,
): JsonCreateTableStatement => {
  const {
    name,
    schema,
    columns,
    compositePrimaryKeys,
    uniqueConstraints,
    checkConstraints,
    policies,
    isRLSEnabled,
  } = table;
  const tableKey = `${schema || "public"}.${name}`;

  // TODO: @AndriiSherman. We need this, will add test cases
  const compositePkName =
    Object.values(compositePrimaryKeys).length > 0
      ? snapshot.tables[tableKey].compositePrimaryKeys[
          `${PgSquasher.unsquashPK(Object.values(compositePrimaryKeys)[0]).name}`
        ].name
      : "";

  return {
    type: "create_table",
    tableName: name,
    schema,
    columns: Object.values(columns),
    compositePKs: Object.values(compositePrimaryKeys),
    compositePkName: compositePkName,
    uniqueConstraints: Object.values(uniqueConstraints),
    policies: Object.values(policies),
    checkConstraints: Object.values(checkConstraints),
    isRLSEnabled: isRLSEnabled ?? false,
  };
};

export const prepareSQLiteCreateTable = (
  table: SQLiteTable,
): JsonSqliteCreateTableStatement => {
  const { name, columns, uniqueConstraints, checkConstraints } = table;

  const references: string[] = Object.values(table.foreignKeys);

  const composites: string[][] = Object.values(table.compositePrimaryKeys).map(
    (it) => SQLiteSquasher.unsquashPK(it),
  );

  const fks = references.map((it) => SQLiteSquasher.unsquashPushFK(it));

  return {
    type: "sqlite_create_table",
    tableName: name,
    columns: Object.values(columns),
    referenceData: fks,
    compositePKs: composites,
    uniqueConstraints: Object.values(uniqueConstraints),
    checkConstraints: Object.values(checkConstraints),
  };
};

export const prepareMySqlCreateTableJson = (
  table: MySqlTable,
  // TODO: remove?
  snapshot: MySqlSnapshot,
  // we need it to know if some of the indexes(and in future other parts) are expressions or columns
  // didn't change mysqlserialaizer, because it will break snapshots and diffs and it's hard to detect
  // if previously it was an expression or column
  internals: MySqlKitInternals,
): JsonCreateTableStatement => {
  const {
    name,
    schema,
    columns,
    compositePrimaryKeys,
    uniqueConstraints,
    checkConstraints,
  } = table;

  const tableKey = schema ? `${schema}.${name}` : name;

  return {
    type: "create_table",
    tableName: name,
    schema,
    columns: Object.values(columns),
    compositePKs: Object.values(compositePrimaryKeys),
    compositePkName:
      Object.values(compositePrimaryKeys).length > 0
        ? snapshot.tables[tableKey].compositePrimaryKeys[
            MySqlSquasher.unsquashPK(Object.values(compositePrimaryKeys)[0])
              .name
          ].name
        : "",
    uniqueConstraints: Object.values(uniqueConstraints),
    internals,
    checkConstraints: Object.values(checkConstraints),
  };
};

export const prepareCreateEnumJson = (
  name: string,
  schema: string,
  values: string[],
): JsonCreateEnumStatement => {
  return {
    type: "create_type_enum",
    name: name,
    schema: schema,
    values,
  };
};

////////////

export const prepareCreateSequenceJson = (
  seq: PgSequence,
): JsonCreateSequenceStatement => {
  const values = PgSquasher.unsquashSequence(seq.values);
  return {
    type: "create_sequence",
    name: seq.name,
    schema: seq.schema,
    values,
  };
};

////////////

export const prepareCreateSchemasJson = (
  values: string[],
): JsonCreateSchema[] => {
  return values.map((it) => {
    return {
      type: "create_schema",
      name: it,
    } as JsonCreateSchema;
  });
};

export const preparePgCreateIndexesJson = (
  tableName: string,
  schema: string,
  indexes: Record<string, string>,
  fullSchema: PgSnapshot,
): JsonPgCreateIndexStatement[] => {
  return Object.values(indexes).map((indexData) => {
    const unsquashedIndex = PgSquasher.unsquashIdxPush(indexData);
    const data =
      fullSchema.tables[`${schema === "" ? "public" : schema}.${tableName}`]
        .indexes[unsquashedIndex.name];
    return {
      type: "create_index_pg",
      tableName,
      data,
      schema,
    };
  });
};

export const prepareCreateIndexesJson = (
  tableName: string,
  schema: string,
  indexes: Record<string, string>,
  // internal?: MySqlKitInternals | SQLiteKitInternals,
  internal?: SQLiteKitInternals,
): JsonCreateIndexStatement[] => {
  return Object.values(indexes).map((indexData) => {
    return {
      type: "create_index",
      tableName,
      data: indexData,
      schema,
      internal,
    };
  });
};

export const prepareCreateReferencesJson = (
  tableName: string,
  schema: string,
  foreignKeys: Record<string, string>,
): JsonCreateReferenceStatement[] => {
  return Object.values(foreignKeys).map((fkData) => {
    return {
      type: "create_reference",
      tableName,
      data: fkData,
      schema,
    };
  });
};

////////////

export const preparePgCreateViewJson = (
  name: string,
  schema: string,
  definition: string,
  materialized: boolean,
  withNoData: boolean = false,
  withOption?: any,
  using?: string,
  tablespace?: string,
): JsonCreatePgViewStatement => {
  return {
    type: "create_view",
    name: name,
    schema: schema,
    definition: definition,
    with: withOption,
    materialized: materialized,
    withNoData,
    using,
    tablespace,
  };
};

export const prepareSqliteCreateViewJson = (
  name: string,
  definition: string,
): JsonCreateSqliteViewStatement => {
  return {
    type: "sqlite_create_view",
    name: name,
    definition: definition,
  };
};

export const prepareMySqlCreateViewJson = (
  name: string,
  schema: string,
  definition: string,
  meta: string,
  replace: boolean = false,
): JsonCreateMySqlViewStatement => {
  const { algorithm, sqlSecurity, withCheckOption } =
    MySqlSquasher.unsquashView(meta);
  return {
    type: "mysql_create_view",
    name: name,
    schema,
    definition: definition,
    algorithm,
    sqlSecurity,
    withCheckOption,
    replace,
  };
};

export const prepareCreateRoleJson = (role: Role): JsonCreateRoleStatement => {
  return {
    type: "create_role",
    name: role.name,
    values: {
      createDb: role.createDb,
      createRole: role.createRole,
      inherit: role.inherit,
    },
  };
};

export const prepareCreatePolicyJsons = (
  tableName: string,
  schema: string,
  policies: Policy[],
): JsonCreatePolicyStatement[] => {
  return policies.map((it) => {
    return {
      type: "create_policy",
      tableName,
      data: it,
      schema,
    };
  });
};

export const prepareCreateIndPolicyJsons = (
  policies: Policy[],
): JsonCreateIndPolicyStatement[] => {
  return policies.map((it) => {
    return {
      type: "create_ind_policy",
      tableName: it.on!,
      data: it,
    };
  });
};
