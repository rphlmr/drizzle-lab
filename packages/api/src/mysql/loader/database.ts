import type { RowDataPacket } from "mysql2/promise";

import type {
  Column,
  MySqlKitInternals,
  MySqlSchemaInternal,
  Table,
  View,
} from "../schema";

// fork: drizzle-kit/src/serializer/mysqlSerializer.ts

function clearDefaults(defaultValue: any, collate: string) {
  if (typeof collate === "undefined" || collate === null) {
    collate = `utf8mb4`;
  }

  let resultDefault = defaultValue;
  collate = `_${collate}`;
  if (defaultValue.startsWith(collate)) {
    resultDefault = resultDefault
      .substring(collate.length, defaultValue.length)
      .replace(/\\/g, "");
    if (resultDefault.startsWith("'") && resultDefault.endsWith("'")) {
      return `('${escapeSingleQuotes(resultDefault.substring(1, resultDefault.length - 1))}')`;
    } else {
      return `'${escapeSingleQuotes(resultDefault.substring(1, resultDefault.length - 1))}'`;
    }
  } else {
    return `(${resultDefault})`;
  }
}

function escapeSingleQuotes(str: string) {
  return str.replace(/'/g, "''");
}

type DB = {
  query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
};

/**
 * Import the Drizzle schema from a PostgreSQL database.
 * @param db - The database to import from.
 * @param inputSchema - The schema to import.
 * @param tablesFilter - The tables to exclude.
 */
export async function importFromDatabase(
  db: DB,
  inputSchema: string,
  tablesFilter: (table: string) => boolean = () => true,
): Promise<MySqlSchemaInternal> {
  const result: Record<string, Table> = {};
  const internals: MySqlKitInternals = { tables: {}, indexes: {} };

  const columns = await db.query(`select * from information_schema.columns
	where table_schema = '${inputSchema}' and table_name != '__drizzle_migrations'
	order by table_name, ordinal_position;`);

  const response = columns as RowDataPacket[];

  const schemas: string[] = [];

  const idxs = await db.query(
    `select * from INFORMATION_SCHEMA.STATISTICS
	WHERE INFORMATION_SCHEMA.STATISTICS.TABLE_SCHEMA = '${inputSchema}' and INFORMATION_SCHEMA.STATISTICS.INDEX_NAME != 'PRIMARY';`,
  );

  const idxRows = idxs as RowDataPacket[];

  for (const column of response) {
    if (!tablesFilter(column["TABLE_NAME"] as string)) continue;

    const schema: string = column["TABLE_SCHEMA"];
    const tableName = column["TABLE_NAME"];

    const columnName: string = column["COLUMN_NAME"];
    const isNullable = column["IS_NULLABLE"] === "YES"; // 'YES', 'NO'
    const columnType = column["COLUMN_TYPE"]; // varchar(256)
    const columnDefault: string = column["COLUMN_DEFAULT"];
    const collation: string = column["CHARACTER_SET_NAME"];
    const geenratedExpression: string = column["GENERATION_EXPRESSION"];

    let columnExtra = column["EXTRA"];
    let isAutoincrement = false; // 'auto_increment', ''
    let isDefaultAnExpression = false; // 'auto_increment', ''

    if (typeof column["EXTRA"] !== "undefined") {
      columnExtra = column["EXTRA"];
      isAutoincrement = column["EXTRA"] === "auto_increment"; // 'auto_increment', ''
      isDefaultAnExpression = column["EXTRA"].includes("DEFAULT_GENERATED"); // 'auto_increment', ''
    }

    // if (isPrimary) {
    //   if (typeof tableToPk[tableName] === "undefined") {
    //     tableToPk[tableName] = [columnName];
    //   } else {
    //     tableToPk[tableName].push(columnName);
    //   }
    // }
    if (schema !== inputSchema) {
      schemas.push(schema);
    }

    const table = result[tableName];

    // let changedType = columnType.replace("bigint unsigned", "serial")
    let changedType = columnType;

    if (columnType === "bigint unsigned" && !isNullable && isAutoincrement) {
      // check unique here
      const uniqueIdx = idxRows.filter(
        (it) =>
          it["COLUMN_NAME"] === columnName &&
          it["TABLE_NAME"] === tableName &&
          it["NON_UNIQUE"] === 0,
      );
      if (uniqueIdx && uniqueIdx.length === 1) {
        changedType = columnType.replace("bigint unsigned", "serial");
      }
    }

    if (columnType.includes("decimal(10,0)")) {
      changedType = columnType.replace("decimal(10,0)", "decimal");
    }

    let onUpdate: boolean | undefined = undefined;
    if (
      columnType.startsWith("timestamp") &&
      typeof columnExtra !== "undefined" &&
      columnExtra.includes("on update CURRENT_TIMESTAMP")
    ) {
      onUpdate = true;
    }

    const newColumn: Column = {
      default:
        columnDefault === null || columnDefault === undefined
          ? undefined
          : /^-?[\d.]+(?:e-?\d+)?$/.test(columnDefault) &&
              !["decimal", "char", "varchar"].some((type) =>
                columnType.startsWith(type),
              )
            ? Number(columnDefault)
            : isDefaultAnExpression
              ? clearDefaults(columnDefault, collation)
              : `'${escapeSingleQuotes(columnDefault)}'`,
      autoincrement: isAutoincrement,
      name: columnName,
      type: changedType,
      primaryKey: false,
      notNull: !isNullable,
      onUpdate,
      generated: geenratedExpression
        ? {
            as: geenratedExpression,
            type: columnExtra === "VIRTUAL GENERATED" ? "virtual" : "stored",
          }
        : undefined,
    };

    // Set default to internal object
    if (isDefaultAnExpression) {
      if (typeof internals!.tables![tableName] === "undefined") {
        internals!.tables![tableName] = {
          columns: {
            [columnName]: {
              isDefaultAnExpression: true,
            },
          },
        };
      } else {
        if (
          typeof internals!.tables![tableName]!.columns[columnName] ===
          "undefined"
        ) {
          internals!.tables![tableName]!.columns[columnName] = {
            isDefaultAnExpression: true,
          };
        } else {
          internals!.tables![tableName]!.columns[
            columnName
          ]!.isDefaultAnExpression = true;
        }
      }
    }

    if (!table) {
      result[tableName] = {
        name: tableName,
        columns: {
          [columnName]: newColumn,
        },
        compositePrimaryKeys: {},
        indexes: {},
        foreignKeys: {},
        uniqueConstraints: {},
        checkConstraints: {},
        relations: [],
        schema,
      };
    } else {
      result[tableName]!.columns[columnName] = newColumn;
    }
  }

  const tablePks = await db.query(
    `SELECT table_name, column_name, ordinal_position
  FROM information_schema.table_constraints t
  LEFT JOIN information_schema.key_column_usage k
  USING(constraint_name,table_schema,table_name)
  WHERE t.constraint_type='PRIMARY KEY'
      and table_name != '__drizzle_migrations'
      AND t.table_schema = '${inputSchema}'
      ORDER BY ordinal_position`,
  );

  const tableToPk: { [tname: string]: string[] } = {};

  const tableToPkRows = tablePks as RowDataPacket[];
  for (const tableToPkRow of tableToPkRows) {
    const tableName: string = tableToPkRow["TABLE_NAME"];
    const columnName: string = tableToPkRow["COLUMN_NAME"];

    if (typeof result[tableName] === "undefined") {
      continue;
    }

    if (typeof tableToPk[tableName] === "undefined") {
      tableToPk[tableName] = [columnName];
    } else {
      tableToPk[tableName].push(columnName);
    }
  }

  for (const [key, value] of Object.entries(tableToPk)) {
    // if (value.length > 1) {
    result[key].compositePrimaryKeys = {
      [`${key}_${value.join("_")}`]: {
        name: `${key}_${value.join("_")}`,
        columns: value,
      },
    };
    // } else if (value.length === 1) {
    // result[key].columns[value[0]].primaryKey = true;
    // } else {
    // }
  }

  try {
    const fks = await db.query(
      `SELECT 
      kcu.TABLE_SCHEMA,
      kcu.TABLE_NAME,
      kcu.CONSTRAINT_NAME,
      kcu.COLUMN_NAME,
      kcu.REFERENCED_TABLE_SCHEMA,
      kcu.REFERENCED_TABLE_NAME,
      kcu.REFERENCED_COLUMN_NAME,
      rc.UPDATE_RULE,
      rc.DELETE_RULE
  FROM 
      INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  LEFT JOIN 
      information_schema.referential_constraints rc 
      ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
  WHERE kcu.TABLE_SCHEMA = '${inputSchema}' AND kcu.CONSTRAINT_NAME != 'PRIMARY' 
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL;`,
    );

    const fkRows = fks as RowDataPacket[];

    for (const fkRow of fkRows) {
      const tableName: string = fkRow["TABLE_NAME"];
      const constraintName = fkRow["CONSTRAINT_NAME"];
      const columnName: string = fkRow["COLUMN_NAME"];
      const refTableName = fkRow["REFERENCED_TABLE_NAME"];
      const refColumnName: string = fkRow["REFERENCED_COLUMN_NAME"];
      const updateRule: string = fkRow["UPDATE_RULE"];
      const deleteRule = fkRow["DELETE_RULE"];

      const tableInResult = result[tableName];
      if (typeof tableInResult === "undefined") continue;

      if (typeof tableInResult.foreignKeys[constraintName] !== "undefined") {
        tableInResult.foreignKeys[constraintName]!.columnsFrom.push(columnName);
        tableInResult.foreignKeys[constraintName]!.columnsTo.push(
          refColumnName,
        );
      } else {
        tableInResult.foreignKeys[constraintName] = {
          name: constraintName,
          tableFrom: tableName,
          tableTo: refTableName,
          columnsFrom: [columnName],
          columnsTo: [refColumnName],
          onDelete: deleteRule?.toLowerCase(),
          onUpdate: updateRule?.toLowerCase(),
        };
      }

      tableInResult.foreignKeys[constraintName]!.columnsFrom = [
        ...new Set(tableInResult.foreignKeys[constraintName]!.columnsFrom),
      ];

      tableInResult.foreignKeys[constraintName]!.columnsTo = [
        ...new Set(tableInResult.foreignKeys[constraintName]!.columnsTo),
      ];
    }
  } catch (e) {
    // console.log(`Can't proccess foreign keys`);
  }

  for (const idxRow of idxRows) {
    const tableName = idxRow["TABLE_NAME"];
    const constraintName = idxRow["INDEX_NAME"];
    const columnName: string = idxRow["COLUMN_NAME"];
    const isUnique = idxRow["NON_UNIQUE"] === 0;

    const tableInResult = result[tableName];
    if (typeof tableInResult === "undefined") continue;

    // if (tableInResult.columns[columnName].type === "serial") continue;
    if (isUnique) {
      if (
        typeof tableInResult.uniqueConstraints[constraintName] !== "undefined"
      ) {
        tableInResult.uniqueConstraints[constraintName]!.columns.push(
          columnName,
        );
      } else {
        tableInResult.uniqueConstraints[constraintName] = {
          name: constraintName,
          columns: [columnName],
        };
      }
    } else {
      // in MySQL FK creates index by default. Name of index is the same as fk constraint name
      // so for introspect we will just skip it
      if (typeof tableInResult.foreignKeys[constraintName] === "undefined") {
        if (typeof tableInResult.indexes[constraintName] !== "undefined") {
          tableInResult.indexes[constraintName]!.columns.push(columnName);
        } else {
          tableInResult.indexes[constraintName] = {
            name: constraintName,
            columns: [columnName],
            isUnique: isUnique,
          };
        }
      }
    }
  }

  const views = await db.query(
    `select * from INFORMATION_SCHEMA.VIEWS WHERE table_schema = '${inputSchema}';`,
  );

  const resultViews: Record<string, View> = {};

  for await (const view of views) {
    const viewName = view["TABLE_NAME"];
    const definition = view["VIEW_DEFINITION"];

    const withCheckOption =
      view["CHECK_OPTION"] === "NONE"
        ? undefined
        : view["CHECK_OPTION"].toLowerCase();
    const sqlSecurity = view["SECURITY_TYPE"].toLowerCase();

    const [createSqlStatement] = await db.query(
      `SHOW CREATE VIEW \`${viewName}\`;`,
    );
    const algorithmMatch =
      createSqlStatement["Create View"].match(/ALGORITHM=([^ ]+)/);
    const algorithm = algorithmMatch
      ? algorithmMatch[1].toLowerCase()
      : undefined;

    const columns = result[viewName].columns;
    delete result[viewName];

    resultViews[viewName] = {
      columns: columns,
      isExisting: false,
      name: viewName,
      algorithm,
      definition,
      sqlSecurity,
      withCheckOption,
      schema: inputSchema,
    };
  }

  const checkConstraints = await db.query(
    `SELECT 
    tc.table_name, 
    tc.constraint_name, 
    cc.check_clause
FROM 
    information_schema.table_constraints tc
JOIN 
    information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE 
    tc.constraint_schema = '${inputSchema}'
AND 
    tc.constraint_type = 'CHECK';`,
  );

  for (const checkConstraintRow of checkConstraints) {
    const constraintName = checkConstraintRow["CONSTRAINT_NAME"];
    const constraintValue = checkConstraintRow["CHECK_CLAUSE"];
    const tableName = checkConstraintRow["TABLE_NAME"];

    const tableInResult = result[tableName];
    // if (typeof tableInResult === 'undefined') continue;
    tableInResult.checkConstraints[constraintName] = {
      name: constraintName,
      value: constraintValue,
    };
  }

  const schemasObject = Object.fromEntries(schemas.map((it) => [it, it]));

  return {
    version: "5",
    dialect: "mysql",
    tables: result,
    views: resultViews,
    _meta: {
      tables: {},
      columns: {},
    },
    internal: internals,
    projectId: "drizzle-lab",
    schemas: schemasObject,
  };
}
