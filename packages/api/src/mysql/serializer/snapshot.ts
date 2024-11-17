import { getTableName, is, Many, SQL } from "drizzle-orm";
import type { PrimaryKey as PrimaryKeyORM } from "drizzle-orm/mysql-core";
import {
  MySqlColumn,
  MySqlDialect,
  getTableConfig,
  getViewConfig,
  uniqueKeyName,
} from "drizzle-orm/mysql-core";

import { schemaToDrizzleObjects, type DrizzleObjects } from "./drizzle-objects";
import type { PartialConfig } from "../../config/loader.node";
import { DrizzleLab } from "../../extensions/symbols";
import type { DrizzleSchema } from "../../internal/global";
import { getColumnCasing, sqlToStr } from "../../internal/helpers";
import type { Relation } from "../../internal/relations";
import { escapeSingleQuotes } from "../../sql/utils";
import type {
  CheckConstraint,
  Column,
  ForeignKey,
  Index,
  MySqlKitInternals,
  PrimaryKey,
  Snapshot,
  Table,
  UniqueConstraint,
  View,
} from "../schema";

// fork: drizzle-kit/src/serializer/mysqlSerializer.ts

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
  { tables, views, relations, schemas }: DrizzleObjects,
  config: PartialConfig = {},
): Snapshot {
  const { casing } = config;
  const projectId = config?.projectId || "drizzle-lab";
  const dialect = new MySqlDialect({ casing });
  const result: Record<string, Table> = {};
  const resultViews: Record<string, View> = {};
  const internal: MySqlKitInternals = { tables: {}, indexes: {} };

  for (const table of tables) {
    // This object stores unique names for checks and will be used to detect if you have the same names for checks
    // within the same PostgreSQL table
    const checksInTable: Record<string, string[]> = {};

    const {
      name: tableName,
      columns,
      indexes,
      foreignKeys,
      schema,
      checks,
      primaryKeys,
      uniqueConstraints,
    } = getTableConfig(table);

    const columnsObject: Record<string, Column> = {};
    const indexesObject: Record<string, Index> = {};
    const foreignKeysObject: Record<string, ForeignKey> = {};
    const primaryKeysObject: Record<string, PrimaryKey> = {};
    const uniqueConstraintObject: Record<string, UniqueConstraint> = {};
    const checkConstraintObject: Record<string, CheckConstraint> = {};
    /* lab extension */
    const tableRelations: Array<Relation> = [];

    columns.forEach((column) => {
      const name = getColumnCasing(column, casing);
      const notNull: boolean = column.notNull;
      const sqlType = column.getSQLType();
      const sqlTypeLowered = sqlType.toLowerCase();
      const autoIncrement =
        typeof (column as any).autoIncrement === "undefined"
          ? false
          : (column as any).autoIncrement;

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
        type: sqlType.startsWith("enum") ? handleEnumType(sqlType) : sqlType,
        primaryKey: false,
        // If field is autoincrement it's notNull by default
        // notNull: autoIncrement ? true : notNull,
        notNull,
        autoincrement: autoIncrement,
        onUpdate: (column as any).hasOnUpdateNow,
        generated: generated
          ? {
              as: is(generated.as, SQL)
                ? dialect.sqlToQuery(generated.as as SQL).sql
                : typeof generated.as === "function"
                  ? dialect.sqlToQuery(generated.as() as SQL).sql
                  : (generated.as as any),
              type: generated.mode ?? "stored",
            }
          : undefined,
        /* lab extension */
        description,
        enumValues,
        defaultFn,
        onUpdateFn,
        jsonShape,
      };

      if (column.primary) {
        primaryKeysObject[`${tableName}_${name}`] = {
          name: `${tableName}_${name}`,
          columns: [name],
        };
      }

      if (column.isUnique) {
        const existingUnique = uniqueConstraintObject[column.uniqueName!];
        if (typeof existingUnique !== "undefined") {
          throw new Error(
            `We've found duplicated unique constraint names in ${
              tableName
            } table. 
          The unique constraint ${column.uniqueName} on the ${
            column.name
          } column is conflicting with a unique constraint name already defined for ${existingUnique.columns.join(
            ",",
          )} columns`,
          );
        }
        uniqueConstraintObject[column.uniqueName!] = {
          name: column.uniqueName!,
          columns: [columnToSet.name],
        };
      }

      if (column.default !== undefined) {
        if (is(column.default, SQL)) {
          columnToSet.default = sqlToStr(column.default, casing);
        } else {
          if (typeof column.default === "string") {
            columnToSet.default = `'${escapeSingleQuotes(column.default)}'`;
          } else {
            if (sqlTypeLowered === "json") {
              columnToSet.default = `'${JSON.stringify(column.default)}'`;
            } else if (column.default instanceof Date) {
              if (sqlTypeLowered === "date") {
                columnToSet.default = `'${column.default.toISOString().split("T")[0]}'`;
              } else if (
                sqlTypeLowered.startsWith("datetime") ||
                sqlTypeLowered.startsWith("timestamp")
              ) {
                columnToSet.default = `'${column.default
                  .toISOString()
                  .replace("T", " ")
                  .slice(0, 23)}'`;
              }
            } else {
              columnToSet.default = column.default;
            }
          }
          if (["blob", "text", "json"].includes(column.getSQLType())) {
            columnToSet.default = `(${columnToSet.default})`;
          }
        }
      }
      columnsObject[name] = columnToSet;
    });

    primaryKeys.map((pk: PrimaryKeyORM) => {
      const originalColumnNames = pk.columns.map((c) => c.name);
      const columnNames = pk.columns.map((c: any) =>
        getColumnCasing(c, casing),
      );

      let name = pk.getName();
      if (casing !== undefined) {
        for (let i = 0; i < originalColumnNames.length; i++) {
          name = name.replace(originalColumnNames[i], columnNames[i]);
        }
      }

      primaryKeysObject[name] = {
        name,
        columns: columnNames,
      };

      // all composite pk's should be treated as notNull
      for (const column of pk.columns) {
        columnsObject[getColumnCasing(column, casing)].notNull = true;
      }
    });

    uniqueConstraints?.map((unq) => {
      const columnNames = unq.columns.map((c) => getColumnCasing(c, casing));

      const name = unq.name ?? uniqueKeyName(table, columnNames);

      const existingUnique = uniqueConstraintObject[name];
      if (typeof existingUnique !== "undefined") {
        throw new Error(
          `We've found duplicated unique constraint names in ${
            tableName
          } table. 
					The unique constraint ${name} on the ${columnNames.join(
            ",",
          )} columns is conflicting with a unique constraint name already defined for ${existingUnique.columns.join(
            ",",
          )} columns`,
        );
      }

      uniqueConstraintObject[name] = {
        name: unq.name!,
        columns: columnNames,
      };
    });

    const fks: ForeignKey[] = foreignKeys.map((fk) => {
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

    fks.forEach((it) => {
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
          return `${getColumnCasing(it, casing)}`;
        }
      });

      if (value.config.unique) {
        if (typeof uniqueConstraintObject[name] !== "undefined") {
          throw new Error(
            `We've found duplicated index name in ${tableName} table. 
					The index ${name} on the ${indexColumns.join(
            ",",
          )} columns is conflicting with a unique constraint name already defined for ${uniqueConstraintObject[
            name
          ].columns.join(",")} columns`,
          );
        }
      } else {
        if (typeof foreignKeysObject[name] !== "undefined") {
          throw new Error(
            `In MySQL, when creating a foreign key, an index is automatically generated with the same name as the foreign key constraint.\n\nWe have encountered a collision between the index name on columns ${indexColumns.join(
              ",",
            )} and the foreign key on columns ${foreignKeysObject[
              name
            ].columnsFrom.join(
              ",",
            )}. Please change either the index name or the foreign key name. For more information, please refer to https://dev.mysql.com/doc/refman/8.0/en/constraint-foreign-key.html`,
          );
        }
      }

      indexesObject[name] = {
        name,
        columns: indexColumns,
        isUnique: value.config.unique ?? false,
        using: value.config.using,
        algorithm: value.config.algorythm,
        lock: value.config.lock,
      };
    });

    checks.forEach((check) => {
      check;
      const checkName = check.name;
      if (typeof checksInTable[tableName] !== "undefined") {
        if (checksInTable[tableName].includes(check.name)) {
          throw new Error(
            `We've found duplicated check constraint name in ${tableName}. Please rename your check constraint in the ${tableName} table`,
          );
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

    // only handle tables without schemas
    // INFO: we derive here from Drizzle kit
    // if (!schema) {
    //   result[tableName] = {
    //     name: tableName,
    //     columns: columnsObject,
    //     indexes: indexesObject,
    //     foreignKeys: foreignKeysObject,
    //     compositePrimaryKeys: primaryKeysObject,
    //     uniqueConstraints: uniqueConstraintObject,
    //   };
    // }
    /* lab extension */
    const description = table[DrizzleLab]?.explain?.description;
    const tableKey = schema ? `${schema}.${tableName}` : tableName;

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

    result[tableKey] = {
      name: tableName,
      schema: schema ?? "",
      columns: columnsObject,
      indexes: indexesObject,
      foreignKeys: foreignKeysObject,
      compositePrimaryKeys: primaryKeysObject,
      uniqueConstraints: uniqueConstraintObject,
      checkConstraint: checkConstraintObject,
      /* lab extension */
      description,
      relations: tableRelations,
    };
  }

  const schemasObject = Object.fromEntries(
    schemas
      .filter((it) => {
        return it.schemaName !== "public";
      })
      .map((it) => [it.schemaName, it.schemaName]),
  );

  for (const view of views) {
    const {
      isExisting,
      name,
      query,
      schema,
      selectedFields,
      algorithm,
      sqlSecurity,
      withCheckOption,
    } = getViewConfig(view);

    const columnsObject: Record<string, Column> = {};

    const existingView = resultViews[name];
    if (typeof existingView !== "undefined") {
      throw new Error(
        `We've found duplicated view name across ${schema ?? "public"} schema. Please rename your view`,
      );
    }

    for (const key in selectedFields) {
      if (is(selectedFields[key], MySqlColumn)) {
        const column = selectedFields[key];

        const notNull: boolean = column.notNull;
        const sqlTypeLowered = column.getSQLType().toLowerCase();
        const autoIncrement =
          typeof (column as any).autoIncrement === "undefined"
            ? false
            : (column as any).autoIncrement;

        const generated = column.generated;

        /* lab extension */
        const enumValues = column.enumValues;
        const defaultFn = column.defaultFn?.toString();
        const onUpdateFn = column.onUpdateFn?.toString();
        const description = view[DrizzleLab]?.explain?.columns?.[column.name];

        const columnToSet: Column = {
          name: column.name,
          type: column.getSQLType(),
          primaryKey: false,
          // If field is autoincrement it's notNull by default
          // notNull: autoIncrement ? true : notNull,
          notNull,
          autoincrement: autoIncrement,
          onUpdate: (column as any).hasOnUpdateNow,
          generated: generated
            ? {
                as: is(generated.as, SQL)
                  ? dialect.sqlToQuery(generated.as as SQL).sql
                  : typeof generated.as === "function"
                    ? dialect.sqlToQuery(generated.as() as SQL).sql
                    : (generated.as as any),
                type: generated.mode ?? "stored",
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
            if (typeof column.default === "string") {
              columnToSet.default = `'${escapeSingleQuotes(column.default)}'`;
            } else {
              if (sqlTypeLowered === "json") {
                columnToSet.default = `'${JSON.stringify(column.default)}'`;
              } else if (column.default instanceof Date) {
                if (sqlTypeLowered === "date") {
                  columnToSet.default = `'${column.default.toISOString().split("T")[0]}'`;
                } else if (
                  sqlTypeLowered.startsWith("datetime") ||
                  sqlTypeLowered.startsWith("timestamp")
                ) {
                  columnToSet.default = `'${column.default
                    .toISOString()
                    .replace("T", " ")
                    .slice(0, 23)}'`;
                }
              } else {
                columnToSet.default = column.default;
              }
            }
            if (["blob", "text", "json"].includes(column.getSQLType())) {
              columnToSet.default = `(${columnToSet.default})`;
            }
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
      withCheckOption,
      algorithm: algorithm ?? "undefined", // set default values
      sqlSecurity: sqlSecurity ?? "definer", // set default values
      /* lab extension */
      schema: schema ?? "",
      description,
    };
  }

  return {
    version: "5",
    dialect: "mysql",
    tables: result,
    views: resultViews,
    _meta: {
      tables: {},
      columns: {},
    },
    internal,
    /* lab extension */
    schemas: schemasObject,
    projectId,
  };
}

const handleEnumType = (type: string) => {
  let str = type.split("(")[1];
  str = str.substring(0, str.length - 1);
  const values = str
    .split(",")
    .map((v) => `'${escapeSingleQuotes(v.substring(1, v.length - 1))}'`);
  return `enum(${values.join(",")})`;
};
