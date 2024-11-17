import chalk from "chalk";
import { getTableName, is, Many, SQL } from "drizzle-orm";
import {
  getTableConfig,
  getViewConfig,
  SQLiteBaseInteger,
  SQLiteColumn,
  SQLiteSyncDialect,
  uniqueKeyName,
} from "drizzle-orm/sqlite-core";

import { schemaToDrizzleObjects, type DrizzleObjects } from "./drizzle-objects";
import type { PartialConfig } from "../../config/loader.node";
import { DrizzleLab } from "../../extensions/symbols";
import type { DrizzleSchema } from "../../internal/global";
import { getColumnCasing, sqlToStr } from "../../internal/helpers";
import type { Relation } from "../../internal/relations";
import { withStyle } from "../../internal/style";
import { escapeSingleQuotes, splitSqlStatements } from "../../sql/utils";
import { importFromDatabase } from "../loader/database";
import type {
  CheckConstraint,
  Column,
  ForeignKey,
  Index,
  PrimaryKey,
  SQLiteKitInternals,
  Snapshot,
  Table,
  UniqueConstraint,
  View,
} from "../schema";

// fork: drizzle-kit/src/serializer/sqliteSerializer.ts

/*
 * Generate a snapshot from the Drizzle schema.
 * @param schema - The Drizzle schema to generate a snapshot from.
 * @param config - The Drizzle configuration to use for the snapshot.
 * @returns A snapshot of the Drizzle schema.
 */
export function schemaToSnapshot(
  schema: DrizzleSchema,
  config: PartialConfig = {},
) {
  return drizzleObjectsToSnapshot(schemaToDrizzleObjects(schema), {
    ...config,
    dialect: "sqlite",
  });
}

/**
 * Generate a snapshot from the Drizzle objects.
 * @param drizzleObjects - The Drizzle objects to generate a snapshot from.
 * @param config - The Drizzle configuration to use for the snapshot.
 * @returns A snapshot of the Drizzle objects.
 */
export function drizzleObjectsToSnapshot(
  { tables, views, relations }: DrizzleObjects,
  config: PartialConfig = {},
): Snapshot {
  const { casing } = config;
  const projectId = config?.projectId || "drizzle-lab";
  const dialect = new SQLiteSyncDialect({ casing });
  const result: Record<string, Table> = {};
  const resultViews: Record<string, View> = {};

  const internal: SQLiteKitInternals = { indexes: {} };
  for (const table of tables) {
    // const tableName = getTableName(table);
    const columnsObject: Record<string, Column> = {};
    const indexesObject: Record<string, Index> = {};
    const foreignKeysObject: Record<string, ForeignKey> = {};
    const primaryKeysObject: Record<string, PrimaryKey> = {};
    const uniqueConstraintObject: Record<string, UniqueConstraint> = {};
    const checkConstraintObject: Record<string, CheckConstraint> = {};

    const checksInTable: Record<string, string[]> = {};

    const {
      name: tableName,
      columns,
      indexes,
      checks,
      foreignKeys: tableForeignKeys,
      primaryKeys,
      uniqueConstraints,
    } = getTableConfig(table);

    /* lab extension */
    const tableRelations: Array<Relation> = [];

    columns.forEach((column) => {
      const name = getColumnCasing(column, casing);
      const notNull: boolean = column.notNull;
      const primaryKey: boolean = column.primary;
      const generated = column.generated;
      /* lab extension */
      const enumValues = column.enumValues;
      const defaultFn = column.defaultFn?.toString();
      const onUpdateFn = column.onUpdateFn?.toString();
      const description = table[DrizzleLab]?.explain?.columns?.[name];
      const jsonShape = JSON.stringify(
        table[DrizzleLab]?.explain?.jsonShapes?.[name],
        null,
        2,
      );

      const columnToSet: Column = {
        name,
        type: column.getSQLType(),
        primaryKey,
        notNull,
        autoincrement: is(column, SQLiteBaseInteger)
          ? column.autoIncrement
          : false,
        generated: generated
          ? {
              as: is(generated.as, SQL)
                ? `(${dialect.sqlToQuery(generated.as as SQL, "indexes").sql})`
                : typeof generated.as === "function"
                  ? `(${dialect.sqlToQuery(generated.as() as SQL, "indexes").sql})`
                  : `(${generated.as as any})`,
              type: generated.mode ?? "virtual",
            }
          : undefined,
        /* lab extension */
        description,
        enumValues,
        defaultFn,
        onUpdateFn,
        jsonShape,
      };

      if (column.default !== undefined) {
        if (is(column.default, SQL)) {
          columnToSet.default = sqlToStr(column.default, casing);
        } else {
          columnToSet.default =
            typeof column.default === "string"
              ? `'${escapeSingleQuotes(column.default)}'`
              : typeof column.default === "object" ||
                  Array.isArray(column.default)
                ? `'${JSON.stringify(column.default)}'`
                : column.default;
        }
      }
      columnsObject[name] = columnToSet;

      if (column.isUnique) {
        const existingUnique = indexesObject[column.uniqueName!];
        if (typeof existingUnique !== "undefined") {
          console.log(
            `\n${withStyle.errorWarning(`We\'ve found duplicated unique constraint names in ${chalk.underline.blue(
              tableName,
            )} table. 
          The unique constraint ${chalk.underline.blue(
            column.uniqueName,
          )} on the ${chalk.underline.blue(
            name,
          )} column is confilcting with a unique constraint name already defined for ${chalk.underline.blue(
            existingUnique.columns.join(","),
          )} columns\n`)}`,
          );
          throw new Error();
        }
        indexesObject[column.uniqueName!] = {
          name: column.uniqueName!,
          columns: [columnToSet.name],
          isUnique: true,
        };
      }
    });

    const foreignKeys: ForeignKey[] = tableForeignKeys.map((fk) => {
      const tableFrom = tableName;
      const onDelete = fk.onDelete ?? "no action";
      const onUpdate = fk.onUpdate ?? "no action";
      const reference = fk.reference();

      const referenceFT = reference.foreignTable;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const tableTo = getTableName(referenceFT);

      const originalColumnsFrom = reference.columns.map((it) => it.name);
      const columnsFrom = reference.columns.map((it) =>
        getColumnCasing(it, casing),
      );
      const originalColumnsTo = reference.foreignColumns.map((it) => it.name);
      const columnsTo = reference.foreignColumns.map((it) =>
        getColumnCasing(it, casing),
      );

      let name = fk.getName();
      if (casing !== undefined) {
        for (let i = 0; i < originalColumnsFrom.length; i++) {
          name = name.replace(originalColumnsFrom[i], columnsFrom[i]);
        }
        for (let i = 0; i < originalColumnsTo.length; i++) {
          name = name.replace(originalColumnsTo[i], columnsTo[i]);
        }
      }

      return {
        name,
        tableFrom,
        tableTo,
        columnsFrom,
        columnsTo,
        onDelete,
        onUpdate,
      } as ForeignKey;
    });

    foreignKeys.forEach((it) => {
      foreignKeysObject[it.name] = it;
    });

    indexes.forEach((value) => {
      const columns = value.config.columns;
      const name = value.config.name;

      let indexColumns = columns.map((it) => {
        if (is(it, SQL)) {
          const sql = dialect.sqlToQuery(it, "indexes").sql;
          if (typeof internal!.indexes![name] === "undefined") {
            internal!.indexes![name] = {
              columns: {
                [sql]: {
                  isExpression: true,
                },
              },
            };
          } else {
            if (typeof internal!.indexes![name]?.columns[sql] === "undefined") {
              internal!.indexes![name]!.columns[sql] = {
                isExpression: true,
              };
            } else {
              internal!.indexes![name]!.columns[sql]!.isExpression = true;
            }
          }
          return sql;
        } else {
          return getColumnCasing(it, casing);
        }
      });

      let where: string | undefined = undefined;
      if (value.config.where !== undefined) {
        if (is(value.config.where, SQL)) {
          where = dialect.sqlToQuery(value.config.where).sql;
        }
      }

      indexesObject[name] = {
        name,
        columns: indexColumns,
        isUnique: value.config.unique ?? false,
        where,
      };
    });

    uniqueConstraints?.map((unq) => {
      const columnNames = unq.columns.map((c) => getColumnCasing(c, casing));

      const name = unq.name ?? uniqueKeyName(table, columnNames);

      const existingUnique = indexesObject[name];
      if (typeof existingUnique !== "undefined") {
        console.log(
          `\n${withStyle.errorWarning(
            `We\'ve found duplicated unique constraint names in ${chalk.underline.blue(
              tableName,
            )} table. \nThe unique constraint ${chalk.underline.blue(
              name,
            )} on the ${chalk.underline.blue(
              columnNames.join(","),
            )} columns is confilcting with a unique constraint name already defined for ${chalk.underline.blue(
              existingUnique.columns.join(","),
            )} columns\n`,
          )}`,
        );
        throw new Error();
      }

      indexesObject[name] = {
        name: unq.name!,
        columns: columnNames,
        isUnique: true,
      };
    });

    primaryKeys.forEach((it) => {
      if (it.columns.length > 1) {
        const originalColumnNames = it.columns.map((c) => c.name);
        const columnNames = it.columns.map((c) => getColumnCasing(c, casing));

        let name = it.getName();
        if (casing !== undefined) {
          for (let i = 0; i < originalColumnNames.length; i++) {
            name = name.replace(originalColumnNames[i], columnNames[i]);
          }
        }

        primaryKeysObject[name] = {
          columns: columnNames,
          name,
        };
      } else {
        columnsObject[getColumnCasing(it.columns[0], casing)].primaryKey = true;
      }
    });

    checks.forEach((check) => {
      const checkName = check.name;
      if (typeof checksInTable[tableName] !== "undefined") {
        if (checksInTable[tableName].includes(check.name)) {
          console.log(
            `\n${withStyle.errorWarning(
              `We\'ve found duplicated check constraint name in ${chalk.underline.blue(
                tableName,
              )}. Please rename your check constraint in the ${chalk.underline.blue(
                tableName,
              )} table`,
            )}`,
          );
          throw new Error();
        }
        checksInTable[tableName].push(checkName);
      } else {
        checksInTable[tableName] = [check.name];
      }

      checkConstraintObject[checkName] = {
        name: checkName,
        value: dialect.sqlToQuery(check.value).sql,
      };
    });

    /* lab extension */
    const description = table[DrizzleLab]?.explain?.description;

    for (const config of relations.filter((r) => r.dbName === tableName)) {
      for (const relation of Object.values(config.relations)) {
        tableRelations.push({
          type: is(relation, Many) ? "many" : "one",
          fieldName: relation.fieldName,
          relationName: relation.relationName || relation.fieldName,
          referencedTableName: relation.referencedTableName,
        });
      }
    }

    result[tableName] = {
      name: tableName,
      columns: columnsObject,
      indexes: indexesObject,
      foreignKeys: foreignKeysObject,
      compositePrimaryKeys: primaryKeysObject,
      uniqueConstraints: uniqueConstraintObject,
      checkConstraints: checkConstraintObject,
      /* lab extension */
      description,
      relations: tableRelations,
    };
  }

  for (const view of views) {
    const { name, isExisting, selectedFields, query, schema } =
      getViewConfig(view);

    const columnsObject: Record<string, Column> = {};

    const existingView = resultViews[name];
    if (typeof existingView !== "undefined") {
      console.log(
        `\n${withStyle.errorWarning(
          `We\'ve found duplicated view name across ${chalk.underline.blue(
            schema ?? "public",
          )} schema. Please rename your view`,
        )}`,
      );
      throw new Error();
    }

    for (const key in selectedFields) {
      if (is(selectedFields[key], SQLiteColumn)) {
        const column = selectedFields[key];
        const notNull: boolean = column.notNull;
        const primaryKey: boolean = column.primary;
        const generated = column.generated;

        /* lab extension */
        const enumValues = column.enumValues;
        const defaultFn = column.defaultFn?.toString();
        const onUpdateFn = column.onUpdateFn?.toString();
        const description = view[DrizzleLab]?.explain?.columns?.[column.name];

        const columnToSet: Column = {
          name: column.name,
          type: column.getSQLType(),
          primaryKey,
          notNull,
          autoincrement: is(column, SQLiteBaseInteger)
            ? column.autoIncrement
            : false,
          generated: generated
            ? {
                as: is(generated.as, SQL)
                  ? `(${dialect.sqlToQuery(generated.as as SQL, "indexes").sql})`
                  : typeof generated.as === "function"
                    ? `(${dialect.sqlToQuery(generated.as() as SQL, "indexes").sql})`
                    : `(${generated.as as any})`,
                type: generated.mode ?? "virtual",
              }
            : undefined,
          /* lab extension */
          enumValues,
          defaultFn,
          onUpdateFn,
          description,
        };

        if (column.default !== undefined) {
          if (is(column.default, SQL)) {
            columnToSet.default = sqlToStr(column.default, casing);
          } else {
            columnToSet.default =
              typeof column.default === "string"
                ? `'${escapeSingleQuotes(column.default)}'`
                : typeof column.default === "object" ||
                    Array.isArray(column.default)
                  ? `'${JSON.stringify(column.default)}'`
                  : column.default;
          }
        }
        columnsObject[column.name] = columnToSet;
      }
    }

    /* lab extension */
    const description = view[DrizzleLab]?.explain?.description;

    resultViews[name] = {
      columns: columnsObject,
      name,
      isExisting,
      definition: isExisting ? undefined : dialect.sqlToQuery(query!).sql,
      /* lab extension */
      description,
    };
  }

  return {
    version: "6",
    dialect: "sqlite",
    tables: result,
    views: resultViews,
    enums: {},
    _meta: {
      tables: {},
      columns: {},
    },
    internal,
    /* lab extension */
    projectId,
  };
}

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
