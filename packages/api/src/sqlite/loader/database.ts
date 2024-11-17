import type {
  CheckConstraint,
  Column,
  ForeignKey,
  SQLiteSchemaInternal,
  Table,
  View,
} from "../schema.ts";

// fork: drizzle-kit/src/serializer/sqliteSerializer.ts

function mapSqlToSqliteType(sqlType: string): string {
  const lowered = sqlType.toLowerCase();
  if (
    [
      "int",
      "integer",
      "integer auto_increment",
      "tinyint",
      "smallint",
      "mediumint",
      "bigint",
      "unsigned big int",
      "int2",
      "int8",
    ].some((it) => lowered.startsWith(it))
  ) {
    return "integer";
  } else if (
    [
      "character",
      "varchar",
      "varying character",
      "national varying character",
      "nchar",
      "native character",
      "nvarchar",
      "text",
      "clob",
    ].some((it) => lowered.startsWith(it))
  ) {
    const match = lowered.match(/\d+/);

    if (match) {
      return `text(${match[0]})`;
    }

    return "text";
  } else if (lowered.startsWith("blob")) {
    return "blob";
  } else if (
    ["real", "double", "double precision", "float"].some((it) =>
      lowered.startsWith(it),
    )
  ) {
    return "real";
  } else {
    return "numeric";
  }
}

interface ColumnInfo {
  columnName: string;
  expression: string;
  type: "stored" | "virtual";
}

function extractGeneratedColumns(input: string): Record<string, ColumnInfo> {
  const columns: Record<string, ColumnInfo> = {};
  const lines = input.split(/,\s*(?![^()]*\))/); // Split by commas outside parentheses

  for (const line of lines) {
    if (line.includes("GENERATED ALWAYS AS")) {
      const parts = line.trim().split(/\s+/);
      const columnName = parts[0].replace(/[`'"]/g, ""); // Remove quotes around the column name
      const expression = line
        .substring(line.indexOf("("), line.indexOf(")") + 1)
        .trim();

      // Extract type ensuring to remove any trailing characters like ')'
      const typeIndex = parts.findIndex((part) =>
        part.match(/(stored|virtual)/i),
      );
      let type: ColumnInfo["type"] = "virtual";
      if (typeIndex !== -1) {
        type = parts[typeIndex]
          .replace(/[^a-z]/gi, "")
          .toLowerCase() as ColumnInfo["type"];
      }

      columns[columnName] = {
        columnName: columnName,
        expression: expression,
        type,
      };
    }
  }
  return columns;
}

type SQLiteDB = {
  query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
};

/**
 * Import the Drizzle schema from a PostgreSQL database.
 * @param db - The database to import from.
 */
export const importFromDatabase = async (
  db: SQLiteDB,
): Promise<SQLiteSchemaInternal> => {
  const result: Record<string, Table> = {};
  const resultViews: Record<string, View> = {};

  const columns = await db.query<{
    tableName: string;
    columnName: string;
    columnType: string;
    notNull: number;
    defaultValue: string;
    pk: number;
    seq: number;
    hidden: number;
    sql: string;
    type: "view" | "table";
  }>(
    `SELECT 
    m.name as "tableName", p.name as "columnName", p.type as "columnType", p."notnull" as "notNull", p.dflt_value as "defaultValue", p.pk as pk, p.hidden as hidden, m.sql, m.type as type
    FROM sqlite_master AS m JOIN pragma_table_xinfo(m.name) AS p
    WHERE (m.type = 'table' OR m.type = 'view')
    and m.tbl_name != 'sqlite_sequence' 
    and m.tbl_name != 'sqlite_stat1' 
    and m.tbl_name != '_litestream_seq' 
    and m.tbl_name != '_litestream_lock' 
    and m.tbl_name != 'libsql_wasm_func_table' 
    and m.tbl_name != '__drizzle_migrations' 
    and m.tbl_name != '_cf_KV';
    `,
  );

  const tablesWithSeq: string[] = [];

  const seq = await db.query<{
    name: string;
  }>(
    `SELECT * FROM sqlite_master WHERE name != 'sqlite_sequence' 
    and name != 'sqlite_stat1' 
    and name != '_litestream_seq' 
    and name != '_litestream_lock' 
    and tbl_name != '_cf_KV' 
    and sql GLOB '*[ *' || CHAR(9) || CHAR(10) || CHAR(13) || ']AUTOINCREMENT[^'']*';`,
  );

  for (const s of seq) {
    tablesWithSeq.push(s.name);
  }

  // append primaryKeys by table
  const tableToPk: { [tname: string]: string[] } = {};

  let tableToGeneratedColumnsInfo: Record<
    string,
    Record<string, ColumnInfo>
  > = {};

  for (const column of columns) {
    // TODO
    if (column.type !== "view") {
      // TODO
    }

    const tableName = column.tableName;

    const columnName = column.columnName;
    const isNotNull = column.notNull === 1; // 'YES', 'NO'
    const columnType = column.columnType; // varchar(256)
    const isPrimary = column.pk !== 0; // 'PRI', ''
    const columnDefault: string = column.defaultValue;

    const isAutoincrement = isPrimary && tablesWithSeq.includes(tableName);

    if (isPrimary) {
      if (typeof tableToPk[tableName] === "undefined") {
        tableToPk[tableName] = [columnName];
      } else {
        tableToPk[tableName].push(columnName);
      }
    }

    const table = result[tableName];

    if (column.hidden === 2 || column.hidden === 3) {
      if (
        typeof tableToGeneratedColumnsInfo[column.tableName] === "undefined"
      ) {
        tableToGeneratedColumnsInfo[column.tableName] = extractGeneratedColumns(
          column.sql,
        );
      }
    }

    const newColumn: Column = {
      default:
        columnDefault === null
          ? undefined
          : /^-?[\d.]+(?:e-?\d+)?$/.test(columnDefault)
            ? Number(columnDefault)
            : ["CURRENT_TIME", "CURRENT_DATE", "CURRENT_TIMESTAMP"].includes(
                  columnDefault,
                )
              ? `(${columnDefault})`
              : columnDefault === "false"
                ? false
                : columnDefault === "true"
                  ? true
                  : columnDefault.startsWith("'") && columnDefault.endsWith("'")
                    ? columnDefault
                    : // ? columnDefault.substring(1, columnDefault.length - 1)
                      `(${columnDefault})`,
      autoincrement: isAutoincrement,
      name: columnName,
      type: mapSqlToSqliteType(columnType),
      primaryKey: false,
      notNull: isNotNull,
      generated:
        tableToGeneratedColumnsInfo[tableName] &&
        tableToGeneratedColumnsInfo[tableName][columnName]
          ? {
              type: tableToGeneratedColumnsInfo[tableName][columnName].type,
              as: tableToGeneratedColumnsInfo[tableName][columnName].expression,
            }
          : undefined,
    };

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
      };
    } else {
      result[tableName]!.columns[columnName] = newColumn;
    }
  }

  for (const [key, value] of Object.entries(tableToPk)) {
    if (value.length > 1) {
      result[key].compositePrimaryKeys = {
        [`${key}_${value.join("_")}_pk`]: {
          columns: value,
          name: `${key}_${value.join("_")}_pk`,
        },
      };
    } else if (value.length === 1) {
      result[key].columns[value[0]].primaryKey = true;
    }
  }

  try {
    const fks = await db.query<{
      tableFrom: string;
      tableTo: string;
      from: string;
      to: string;
      onUpdate: string;
      onDelete: string;
      seq: number;
      id: number;
    }>(
      `SELECT m.name as "tableFrom", f.id as "id", f."table" as "tableTo", f."from", f."to", f."on_update" as "onUpdate", f."on_delete" as "onDelete", f.seq as "seq"
      FROM sqlite_master m, pragma_foreign_key_list(m.name) as f 
      where m.tbl_name != '_cf_KV';`,
    );

    const fkByTableName: Record<string, ForeignKey> = {};

    for (const fkRow of fks) {
      const tableName: string = fkRow.tableFrom;
      const columnName: string = fkRow.from;
      const refTableName = fkRow.tableTo;
      const refColumnName: string = fkRow.to;
      const updateRule: string = fkRow.onUpdate;
      const deleteRule = fkRow.onDelete;
      const id = fkRow.id;

      const tableInResult = result[tableName];
      if (typeof tableInResult === "undefined") continue;

      if (typeof fkByTableName[`${tableName}_${id}`] !== "undefined") {
        fkByTableName[`${tableName}_${id}`]!.columnsFrom.push(columnName);
        fkByTableName[`${tableName}_${id}`]!.columnsTo.push(refColumnName);
      } else {
        fkByTableName[`${tableName}_${id}`] = {
          name: "",
          tableFrom: tableName,
          tableTo: refTableName,
          columnsFrom: [columnName],
          columnsTo: [refColumnName],
          onDelete: deleteRule?.toLowerCase(),
          onUpdate: updateRule?.toLowerCase(),
        };
      }

      const columnsFrom = fkByTableName[`${tableName}_${id}`].columnsFrom;
      const columnsTo = fkByTableName[`${tableName}_${id}`].columnsTo;
      fkByTableName[`${tableName}_${id}`].name =
        `${tableName}_${columnsFrom.join(
          "_",
        )}_${refTableName}_${columnsTo.join("_")}_fk`;
    }

    for (const idx of Object.keys(fkByTableName)) {
      const value = fkByTableName[idx];
      result[value.tableFrom].foreignKeys[value.name] = value;
    }
  } catch (e) {
    // console.log(`Can't proccess foreign keys`);
  }

  const idxs = await db.query<{
    tableName: string;
    indexName: string;
    columnName: string;
    isUnique: number;
    seq: string;
  }>(
    `SELECT 
    m.tbl_name as tableName,
    il.name as indexName,
    ii.name as columnName,
    il.[unique] as isUnique,
    il.seq as seq
FROM sqlite_master AS m,
    pragma_index_list(m.name) AS il,
    pragma_index_info(il.name) AS ii
WHERE 
    m.type = 'table' 
    and il.name NOT LIKE 'sqlite_autoindex_%'
    and m.tbl_name != '_cf_KV';`,
  );

  for (const idxRow of idxs) {
    const tableName = idxRow.tableName;
    const constraintName = idxRow.indexName;
    const columnName: string = idxRow.columnName;
    const isUnique = idxRow.isUnique === 1;

    const tableInResult = result[tableName];
    if (typeof tableInResult === "undefined") continue;

    if (
      typeof tableInResult.indexes[constraintName] !== "undefined" &&
      columnName
    ) {
      tableInResult.indexes[constraintName]!.columns.push(columnName);
    } else {
      tableInResult.indexes[constraintName] = {
        name: constraintName,
        columns: columnName ? [columnName] : [],
        isUnique: isUnique,
      };
    }
    // if (isUnique) {
    //   if (typeof tableInResult.uniqueConstraints[constraintName] !== "undefined") {
    //     tableInResult.uniqueConstraints[constraintName]!.columns.push(columnName);
    //   } else {
    //     tableInResult.uniqueConstraints[constraintName] = {
    //       name: constraintName,
    //       columns: [columnName],
    //     };
    //   }
    // } else {
    //   if (typeof tableInResult.indexes[constraintName] !== "undefined") {
    //     tableInResult.indexes[constraintName]!.columns.push(columnName);
    //   } else {
    //     tableInResult.indexes[constraintName] = {
    //       name: constraintName,
    //       columns: [columnName],
    //       isUnique: isUnique,
    //     };
    //   }
    // }
  }

  const views = await db.query(
    `SELECT name AS view_name, sql AS sql FROM sqlite_master WHERE type = 'view';`,
  );

  for (const view of views) {
    const viewName = view["view_name"];
    const sql = view["sql"];

    const regex = new RegExp(`\\bAS\\b\\s+(SELECT.+)$`, "i");
    const match = sql.match(regex);

    if (!match) {
      throw new Error("Could not process view");
    }

    const viewDefinition = match[1] as string;

    const columns = result[viewName].columns;
    delete result[viewName];

    resultViews[viewName] = {
      columns: columns,
      isExisting: false,
      name: viewName,
      definition: viewDefinition,
    };
  }

  const namedCheckPattern =
    /CONSTRAINT\s*["']?(\w+)["']?\s*CHECK\s*\((.*?)\)/gi;
  const unnamedCheckPattern = /CHECK\s*\((.*?)\)/gi;
  let checkCounter = 0;
  const checkConstraints: Record<string, CheckConstraint> = {};
  const checks = await db.query<{
    tableName: string;
    sql: string;
  }>(`SELECT name as "tableName", sql as "sql"
		FROM sqlite_master 
		WHERE type = 'table' AND name != 'sqlite_sequence';`);
  for (const check of checks) {
    const { tableName, sql } = check;

    // Find named CHECK constraints
    let namedChecks = [...sql.matchAll(namedCheckPattern)];
    if (namedChecks.length > 0) {
      namedChecks.forEach(([_, checkName, checkValue]) => {
        checkConstraints[checkName] = {
          name: checkName,
          value: checkValue.trim(),
        };
      });
    } else {
      // If no named constraints, find unnamed CHECK constraints and assign names
      let unnamedChecks = [...sql.matchAll(unnamedCheckPattern)];
      unnamedChecks.forEach(([_, checkValue]) => {
        let checkName = `${tableName}_check_${++checkCounter}`;
        checkConstraints[checkName] = {
          name: checkName,
          value: checkValue.trim(),
        };
      });
    }

    const table = result[tableName];

    if (!table) {
      result[tableName] = {
        name: tableName,
        columns: {},
        compositePrimaryKeys: {},
        indexes: {},
        foreignKeys: {},
        uniqueConstraints: {},
        checkConstraints: checkConstraints,
        relations: [],
      };
    } else {
      result[tableName]!.checkConstraints = checkConstraints;
    }
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
    projectId: "drizzle-lab",
  };
};
