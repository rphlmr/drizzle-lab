/* eslint-disable no-useless-escape */
import type {
  JsonCreateMySqlViewStatement,
  JsonCreatePgViewStatement,
  JsonCreateSqliteViewStatement,
  JsonCreateCompositePK,
  JsonCreateEnumStatement,
  JsonCreateIndexStatement,
  JsonCreateReferenceStatement,
  JsonCreateSchema,
  JsonCreateSequenceStatement,
  JsonCreateTableStatement,
  JsonCreateUniqueConstraint,
  JsonPgCreateIndexStatement,
  JsonSqliteCreateTableStatement,
  JsonStatement,
  JsonCreateRoleStatement,
  JsonCreatePolicyStatement,
  JsonCreateIndPolicyStatement,
  JsonEnableRLSStatement,
} from "./create-statements";
import { escapeSingleQuotes } from "./utils";
import { MySqlSquasher } from "../mysql/schema";
import { PgSquasher } from "../pg/schema";
import { SQLiteSquasher } from "../sqlite/schema";

// fork: drizzle-kit/src/sqlgenerator.ts

export const dialects = ["postgresql", "mysql", "sqlite", "turso"] as const;

export type Dialect = (typeof dialects)[number];

const parseType = (schemaPrefix: string, type: string) => {
  const pgNativeTypes = [
    "uuid",
    "smallint",
    "integer",
    "bigint",
    "boolean",
    "text",
    "varchar",
    "serial",
    "bigserial",
    "decimal",
    "numeric",
    "real",
    "json",
    "jsonb",
    "time",
    "time with time zone",
    "time without time zone",
    "time",
    "timestamp",
    "timestamp with time zone",
    "timestamp without time zone",
    "date",
    "interval",
    "bigint",
    "bigserial",
    "double precision",
    "interval year",
    "interval month",
    "interval day",
    "interval hour",
    "interval minute",
    "interval second",
    "interval year to month",
    "interval day to hour",
    "interval day to minute",
    "interval day to second",
    "interval hour to minute",
    "interval hour to second",
    "interval minute to second",
    "char",
    "vector",
    "geometry",
  ];
  const arrayDefinitionRegex = /\[\d*(?:\[\d*\])*\]/g;
  const arrayDefinition = (type.match(arrayDefinitionRegex) ?? []).join("");
  const withoutArrayDefinition = type.replace(arrayDefinitionRegex, "");
  return pgNativeTypes.some((it) => type.startsWith(it))
    ? `${withoutArrayDefinition}${arrayDefinition}`
    : `${schemaPrefix}"${withoutArrayDefinition}"${arrayDefinition}`;
};

abstract class Convertor {
  abstract can(statement: JsonStatement, dialect: Dialect): boolean;
  abstract convert(statement: JsonStatement): string | string[];
}

class PgCreateRoleConvertor extends Convertor {
  override can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_role" && dialect === "postgresql";
  }
  override convert(statement: JsonCreateRoleStatement): string | string[] {
    return `CREATE ROLE "${statement.name}"${
      statement.values.createDb ||
      statement.values.createRole ||
      !statement.values.inherit
        ? ` WITH${statement.values.createDb ? " CREATEDB" : ""}${statement.values.createRole ? " CREATEROLE" : ""}${
            statement.values.inherit ? "" : " NOINHERIT"
          }`
        : ""
    };`;
  }
}

class PgCreatePolicyConvertor extends Convertor {
  override can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_policy" && dialect === "postgresql";
  }
  override convert(statement: JsonCreatePolicyStatement): string | string[] {
    const policy = statement.data;

    const tableNameWithSchema = statement.schema
      ? `"${statement.schema}"."${statement.tableName}"`
      : `"${statement.tableName}"`;

    const usingPart = policy.using ? ` USING (${policy.using})` : "";

    const withCheckPart = policy.withCheck
      ? ` WITH CHECK (${policy.withCheck})`
      : "";

    const policyToPart = policy.to
      ?.map((v) =>
        ["current_user", "current_role", "session_user", "public"].includes(v)
          ? v
          : `"${v}"`,
      )
      .join(", ");

    return `CREATE POLICY "${policy.name}" ON ${tableNameWithSchema} AS ${policy.as?.toUpperCase()} FOR ${policy.for?.toUpperCase()} TO ${policyToPart}${usingPart}${withCheckPart};`;
  }
}

class PgCreateIndPolicyConvertor extends Convertor {
  override can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_ind_policy" && dialect === "postgresql";
  }
  override convert(statement: JsonCreateIndPolicyStatement): string | string[] {
    const policy = statement.data;

    const usingPart = policy.using ? ` USING (${policy.using})` : "";

    const withCheckPart = policy.withCheck
      ? ` WITH CHECK (${policy.withCheck})`
      : "";

    const policyToPart = policy.to
      ?.map((v) =>
        ["current_user", "current_role", "session_user", "public"].includes(v)
          ? v
          : `"${v}"`,
      )
      .join(", ");

    return `CREATE POLICY "${policy.name}" ON ${policy.on} AS ${policy.as?.toUpperCase()} FOR ${policy.for?.toUpperCase()} TO ${policyToPart}${usingPart}${withCheckPart};`;
  }
}

class PgEnableRlsConvertor extends Convertor {
  override can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "enable_rls" && dialect === "postgresql";
  }
  override convert(statement: JsonEnableRLSStatement): string {
    const tableNameWithSchema = statement.schema
      ? `"${statement.schema}"."${statement.tableName}"`
      : `"${statement.tableName}"`;

    return `ALTER TABLE ${tableNameWithSchema} ENABLE ROW LEVEL SECURITY;`;
  }
}

class PgCreateTableConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_table" && dialect === "postgresql";
  }

  convert(st: JsonCreateTableStatement) {
    const {
      tableName,
      schema,
      columns,
      compositePKs,
      uniqueConstraints,
      checkConstraints,
      policies,
      isRLSEnabled,
    } = st;

    let statement = "";
    const name = schema ? `"${schema}"."${tableName}"` : `"${tableName}"`;

    statement += `CREATE TABLE IF NOT EXISTS ${name} (\n`;
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];

      const primaryKeyStatement = column.primaryKey ? " PRIMARY KEY" : "";
      const notNullStatement =
        column.notNull && !column.identity ? " NOT NULL" : "";
      const defaultStatement =
        column.default !== undefined ? ` DEFAULT ${column.default}` : "";

      const uniqueConstraint = column.isUnique
        ? ` CONSTRAINT "${column.uniqueName}" UNIQUE${column.nullsNotDistinct ? " NULLS NOT DISTINCT" : ""}`
        : "";

      const schemaPrefix =
        column.typeSchema && column.typeSchema !== "public"
          ? `"${column.typeSchema}".`
          : "";

      const type = parseType(schemaPrefix, column.type);
      const generated = column.generated;

      const generatedStatement = generated
        ? ` GENERATED ALWAYS AS (${generated?.as}) STORED`
        : "";

      const unsquashedIdentity = column.identity
        ? PgSquasher.unsquashIdentity(column.identity)
        : undefined;

      const identityWithSchema = schema
        ? `"${schema}"."${unsquashedIdentity?.name}"`
        : `"${unsquashedIdentity?.name}"`;

      const identity = unsquashedIdentity
        ? ` GENERATED ${
            unsquashedIdentity.type === "always" ? "ALWAYS" : "BY DEFAULT"
          } AS IDENTITY (sequence name ${identityWithSchema}${
            unsquashedIdentity.increment
              ? ` INCREMENT BY ${unsquashedIdentity.increment}`
              : ""
          }${
            unsquashedIdentity.minValue
              ? ` MINVALUE ${unsquashedIdentity.minValue}`
              : ""
          }${
            unsquashedIdentity.maxValue
              ? ` MAXVALUE ${unsquashedIdentity.maxValue}`
              : ""
          }${
            unsquashedIdentity.startWith
              ? ` START WITH ${unsquashedIdentity.startWith}`
              : ""
          }${unsquashedIdentity.cache ? ` CACHE ${unsquashedIdentity.cache}` : ""}${
            unsquashedIdentity.cycle ? ` CYCLE` : ""
          })`
        : "";

      statement +=
        "\t" +
        `"${column.name}" ${type}${primaryKeyStatement}${defaultStatement}${generatedStatement}${notNullStatement}${uniqueConstraint}${identity}`;
      statement += i === columns.length - 1 ? "" : ",\n";
    }

    if (typeof compositePKs !== "undefined" && compositePKs.length > 0) {
      statement += ",\n";
      const compositePK = PgSquasher.unsquashPK(compositePKs[0]);
      statement += `\tCONSTRAINT "${st.compositePkName}" PRIMARY KEY(\"${compositePK.columns.join(`","`)}\")`;
      // statement += `\n`;
    }

    if (
      typeof uniqueConstraints !== "undefined" &&
      uniqueConstraints.length > 0
    ) {
      for (const uniqueConstraint of uniqueConstraints) {
        statement += ",\n";
        const unsquashedUnique = PgSquasher.unsquashUnique(uniqueConstraint);
        statement += `\tCONSTRAINT "${unsquashedUnique.name}" UNIQUE${
          unsquashedUnique.nullsNotDistinct ? " NULLS NOT DISTINCT" : ""
        }(\"${unsquashedUnique.columns.join(`","`)}\")`;
        // statement += `\n`;
      }
    }

    if (
      typeof checkConstraints !== "undefined" &&
      checkConstraints.length > 0
    ) {
      for (const checkConstraint of checkConstraints) {
        statement += ",\n";
        const unsquashedCheck = PgSquasher.unsquashCheck(checkConstraint);
        statement += `\tCONSTRAINT "${unsquashedCheck.name}" CHECK (${unsquashedCheck.value})`;
      }
    }

    statement += `\n);`;
    statement += `\n`;

    const enableRls = new PgEnableRlsConvertor().convert({
      type: "enable_rls",
      tableName,
      schema,
    });

    return [
      statement,
      ...((policies && policies.length > 0) || isRLSEnabled ? [enableRls] : []),
    ];
  }
}

class MySqlCreateTableConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_table" && dialect === "mysql";
  }

  convert(st: JsonCreateTableStatement) {
    const {
      tableName,
      columns,
      checkConstraints,
      compositePKs,
      uniqueConstraints,
      internals,
      /* lab extension */
      schema,
    } = st;

    let statement = "";
    /* lab extension */
    const name = schema ? `\`${schema}\`.\`${tableName}\`` : `\`${tableName}\``;
    statement += `CREATE TABLE ${name} (\n`;
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];

      const primaryKeyStatement = column.primaryKey ? " PRIMARY KEY" : "";
      const notNullStatement = column.notNull ? " NOT NULL" : "";
      const defaultStatement =
        column.default !== undefined ? ` DEFAULT ${column.default}` : "";

      const onUpdateStatement = column.onUpdate
        ? ` ON UPDATE CURRENT_TIMESTAMP`
        : "";

      const autoincrementStatement = column.autoincrement
        ? " AUTO_INCREMENT"
        : "";

      const generatedStatement = column.generated
        ? ` GENERATED ALWAYS AS (${column.generated?.as}) ${column.generated?.type.toUpperCase()}`
        : "";

      statement +=
        "\t" +
        `\`${column.name}\` ${column.type}${autoincrementStatement}${primaryKeyStatement}${generatedStatement}${notNullStatement}${defaultStatement}${onUpdateStatement}`;
      statement += i === columns.length - 1 ? "" : ",\n";
    }

    if (typeof compositePKs !== "undefined" && compositePKs.length > 0) {
      statement += ",\n";
      const compositePK = MySqlSquasher.unsquashPK(compositePKs[0]);
      statement += `\tCONSTRAINT \`${st.compositePkName}\` PRIMARY KEY(\`${compositePK.columns.join(`\`,\``)}\`)`;
    }

    if (
      typeof uniqueConstraints !== "undefined" &&
      uniqueConstraints.length > 0
    ) {
      for (const uniqueConstraint of uniqueConstraints) {
        statement += ",\n";
        const unsquashedUnique = MySqlSquasher.unsquashUnique(uniqueConstraint);

        const uniqueString = unsquashedUnique.columns
          .map((it) => {
            return internals?.indexes
              ? internals?.indexes[unsquashedUnique.name]?.columns[it]
                  ?.isExpression
                ? it
                : `\`${it}\``
              : `\`${it}\``;
          })
          .join(",");

        statement += `\tCONSTRAINT \`${unsquashedUnique.name}\` UNIQUE(${uniqueString})`;
      }
    }

    if (
      typeof checkConstraints !== "undefined" &&
      checkConstraints.length > 0
    ) {
      for (const checkConstraint of checkConstraints) {
        statement += ",\n";
        const unsquashedCheck = MySqlSquasher.unsquashCheck(checkConstraint);

        statement += `\tCONSTRAINT \`${unsquashedCheck.name}\` CHECK(${unsquashedCheck.value})`;
      }
    }

    statement += `\n);`;
    statement += `\n`;
    return statement;
  }
}

export class SQLiteCreateTableConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return (
      statement.type === "sqlite_create_table" &&
      (dialect === "sqlite" || dialect === "turso")
    );
  }

  convert(st: JsonSqliteCreateTableStatement) {
    const {
      tableName,
      columns,
      referenceData,
      compositePKs,
      uniqueConstraints,
      checkConstraints,
    } = st;

    let statement = "";
    statement += `CREATE TABLE \`${tableName}\` (\n`;
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];

      const primaryKeyStatement = column.primaryKey ? " PRIMARY KEY" : "";
      const notNullStatement = column.notNull ? " NOT NULL" : "";
      const defaultStatement =
        column.default !== undefined ? ` DEFAULT ${column.default}` : "";

      const autoincrementStatement = column.autoincrement
        ? " AUTOINCREMENT"
        : "";

      const generatedStatement = column.generated
        ? ` GENERATED ALWAYS AS ${column.generated.as} ${column.generated.type.toUpperCase()}`
        : "";

      statement += "\t";
      statement += `\`${column.name}\` ${column.type}${primaryKeyStatement}${autoincrementStatement}${defaultStatement}${generatedStatement}${notNullStatement}`;

      statement += i === columns.length - 1 ? "" : ",\n";
    }

    compositePKs.forEach((it) => {
      statement += ",\n\t";
      statement += `PRIMARY KEY(${it.map((it) => `\`${it}\``).join(", ")})`;
    });

    for (let i = 0; i < referenceData.length; i++) {
      const {
        name,
        tableFrom,
        tableTo,
        columnsFrom,
        columnsTo,
        onDelete,
        onUpdate,
      } = referenceData[i];

      const onDeleteStatement = onDelete ? ` ON DELETE ${onDelete}` : "";
      const onUpdateStatement = onUpdate ? ` ON UPDATE ${onUpdate}` : "";
      const fromColumnsString = columnsFrom.map((it) => `\`${it}\``).join(",");
      const toColumnsString = columnsTo.map((it) => `\`${it}\``).join(",");

      statement += ",";
      statement += "\n\t";
      statement += `FOREIGN KEY (${fromColumnsString}) REFERENCES \`${tableTo}\`(${toColumnsString})${onUpdateStatement}${onDeleteStatement}`;
    }

    if (
      typeof uniqueConstraints !== "undefined" &&
      uniqueConstraints.length > 0
    ) {
      for (const uniqueConstraint of uniqueConstraints) {
        statement += ",\n";
        const unsquashedUnique =
          SQLiteSquasher.unsquashUnique(uniqueConstraint);
        statement += `\tCONSTRAINT ${unsquashedUnique.name} UNIQUE(\`${unsquashedUnique.columns.join(`\`,\``)}\`)`;
      }
    }

    if (
      typeof checkConstraints !== "undefined" &&
      checkConstraints.length > 0
    ) {
      for (const check of checkConstraints) {
        statement += ",\n";
        const { value, name } = SQLiteSquasher.unsquashCheck(check);
        statement += `\tCONSTRAINT "${name}" CHECK(${value})`;
      }
    }

    statement += `\n`;
    statement += `);`;
    statement += `\n`;
    return statement;
  }
}

class PgAlterTableAddUniqueConstraintConvertor extends Convertor {
  can(statement: JsonCreateUniqueConstraint, dialect: Dialect): boolean {
    return (
      statement.type === "create_unique_constraint" && dialect === "postgresql"
    );
  }
  convert(statement: JsonCreateUniqueConstraint): string {
    const unsquashed = PgSquasher.unsquashUnique(statement.data);

    const tableNameWithSchema = statement.schema
      ? `"${statement.schema}"."${statement.tableName}"`
      : `"${statement.tableName}"`;

    return `ALTER TABLE ${tableNameWithSchema} ADD CONSTRAINT "${unsquashed.name}" UNIQUE${
      unsquashed.nullsNotDistinct ? " NULLS NOT DISTINCT" : ""
    }("${unsquashed.columns.join('","')}");`;
  }
}

class MySQLAlterTableAddUniqueConstraintConvertor extends Convertor {
  can(statement: JsonCreateUniqueConstraint, dialect: Dialect): boolean {
    return statement.type === "create_unique_constraint" && dialect === "mysql";
  }
  convert(statement: JsonCreateUniqueConstraint): string {
    const unsquashed = MySqlSquasher.unsquashUnique(statement.data);

    const tableNameWithSchema = statement.schema
      ? `\`${statement.schema}\`.\`${statement.tableName}\``
      : `\`${statement.tableName}\``;

    return `ALTER TABLE ${tableNameWithSchema} ADD CONSTRAINT \`${unsquashed.name}\` UNIQUE(\`${unsquashed.columns.join(
      "`,`",
    )}\`);`;
  }
}

class CreatePgSequenceConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_sequence" && dialect === "postgresql";
  }

  convert(st: JsonCreateSequenceStatement) {
    const { name, values, schema } = st;

    const sequenceWithSchema = schema ? `"${schema}"."${name}"` : `"${name}"`;

    return `CREATE SEQUENCE ${sequenceWithSchema}${values.increment ? ` INCREMENT BY ${values.increment}` : ""}${
      values.minValue ? ` MINVALUE ${values.minValue}` : ""
    }${values.maxValue ? ` MAXVALUE ${values.maxValue}` : ""}${
      values.startWith ? ` START WITH ${values.startWith}` : ""
    }${values.cache ? ` CACHE ${values.cache}` : ""}${values.cycle ? ` CYCLE` : ""};`;
  }
}

class CreateTypeEnumConvertor extends Convertor {
  can(statement: JsonStatement): boolean {
    return statement.type === "create_type_enum";
  }

  convert(st: JsonCreateEnumStatement) {
    const { name, values, schema } = st;

    const tableNameWithSchema = schema ? `"${schema}"."${name}"` : `"${name}"`;

    let valuesStatement = "(";
    valuesStatement += values
      .map((it) => `'${escapeSingleQuotes(it)}'`)
      .join(", ");
    valuesStatement += ")";

    let statement = "DO $$ BEGIN";
    statement += "\n";
    statement += ` CREATE TYPE ${tableNameWithSchema} AS ENUM${valuesStatement};`;
    statement += "\n";
    statement += "EXCEPTION";
    statement += "\n";
    statement += " WHEN duplicate_object THEN null;";
    statement += "\n";
    statement += "END $$;";
    statement += "\n";
    return statement;
  }
}

class PgAlterTableCreateCompositePrimaryKeyConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_composite_pk" && dialect === "postgresql";
  }

  convert(statement: JsonCreateCompositePK) {
    const { name, columns } = PgSquasher.unsquashPK(statement.data);

    const tableNameWithSchema = statement.schema
      ? `"${statement.schema}"."${statement.tableName}"`
      : `"${statement.tableName}"`;

    return `ALTER TABLE ${tableNameWithSchema} ADD CONSTRAINT "${statement.constraintName}" PRIMARY KEY("${columns.join(
      '","',
    )}");`;
  }
}

class MySqlAlterTableCreateCompositePrimaryKeyConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_composite_pk" && dialect === "mysql";
  }

  convert(statement: JsonCreateCompositePK) {
    const { name, columns } = MySqlSquasher.unsquashPK(statement.data);

    const tableNameWithSchema = statement.schema
      ? `\`${statement.schema}\`.\`${statement.tableName}\``
      : `\`${statement.tableName}\``;

    return `ALTER TABLE ${tableNameWithSchema} ADD PRIMARY KEY(\`${columns.join("`,`")}\`);`;
  }
}

// FK
class PgCreateForeignKeyConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_reference" && dialect === "postgresql";
  }

  convert(statement: JsonCreateReferenceStatement): string {
    const {
      name,
      tableFrom,
      tableTo,
      columnsFrom,
      columnsTo,
      onDelete,
      onUpdate,
      schemaTo,
    } = PgSquasher.unsquashFK(statement.data);
    const onDeleteStatement = onDelete ? ` ON DELETE ${onDelete}` : "";
    const onUpdateStatement = onUpdate ? ` ON UPDATE ${onUpdate}` : "";
    const fromColumnsString = columnsFrom.map((it) => `"${it}"`).join(",");
    const toColumnsString = columnsTo.map((it) => `"${it}"`).join(",");

    const tableNameWithSchema = statement.schema
      ? `"${statement.schema}"."${tableFrom}"`
      : `"${tableFrom}"`;

    const tableToNameWithSchema = schemaTo
      ? `"${schemaTo}"."${tableTo}"`
      : `"${tableTo}"`;

    const alterStatement = `ALTER TABLE ${tableNameWithSchema} ADD CONSTRAINT "${name}" FOREIGN KEY (${fromColumnsString}) REFERENCES ${tableToNameWithSchema}(${toColumnsString})${onDeleteStatement}${onUpdateStatement}`;

    let sql = "DO $$ BEGIN\n";
    sql += " " + alterStatement + ";\n";
    sql += "EXCEPTION\n";
    sql += " WHEN duplicate_object THEN null;\n";
    sql += "END $$;\n";
    return sql;
  }
}

class MySqlCreateForeignKeyConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_reference" && dialect === "mysql";
  }

  convert(statement: JsonCreateReferenceStatement): string {
    const {
      name,
      tableFrom,
      tableTo,
      columnsFrom,
      columnsTo,
      onDelete,
      onUpdate,
      schemaTo,
    } = MySqlSquasher.unsquashFK(statement.data);
    const onDeleteStatement = onDelete ? ` ON DELETE ${onDelete}` : "";
    const onUpdateStatement = onUpdate ? ` ON UPDATE ${onUpdate}` : "";
    const fromColumnsString = columnsFrom.map((it) => `\`${it}\``).join(",");
    const toColumnsString = columnsTo.map((it) => `\`${it}\``).join(",");

    const tableNameWithSchema = statement.schema
      ? `\`${statement.schema}\`.\`${statement.tableName}\``
      : `\`${statement.tableName}\``;

    const tableToNameWithSchema = statement.schema
      ? `\`${schemaTo}\`.\`${tableTo}\``
      : `\`${tableTo}\``;

    return `ALTER TABLE ${tableNameWithSchema} ADD CONSTRAINT \`${name}\` FOREIGN KEY (${fromColumnsString}) REFERENCES ${tableToNameWithSchema}(${toColumnsString})${onDeleteStatement}${onUpdateStatement};`;
  }
}

class CreatePgIndexConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_index_pg" && dialect === "postgresql";
  }

  convert(statement: JsonPgCreateIndexStatement): string {
    const {
      name,
      columns,
      isUnique,
      concurrently,
      with: withMap,
      method,
      where,
    } = statement.data;
    // // since postgresql 9.5
    const indexPart = isUnique ? "UNIQUE INDEX" : "INDEX";
    const value = columns
      .map(
        (it) =>
          `${it.isExpression ? it.expression : `"${it.expression}"`}${
            it.opclass ? ` ${it.opclass}` : it.asc ? "" : " DESC"
          }${
            (it.asc && it.nulls && it.nulls === "last") || it.opclass
              ? ""
              : ` NULLS ${it.nulls!.toUpperCase()}`
          }`,
      )
      .join(",");

    const tableNameWithSchema = statement.schema
      ? `"${statement.schema}"."${statement.tableName}"`
      : `"${statement.tableName}"`;

    function reverseLogic(mappedWith: Record<string, string>): string {
      let reversedString = "";
      for (const key in mappedWith) {
        // eslint-disable-next-line no-prototype-builtins
        if (mappedWith.hasOwnProperty(key)) {
          reversedString += `${key}=${mappedWith[key]},`;
        }
      }
      reversedString = reversedString.slice(0, -1);
      return reversedString;
    }

    return `CREATE ${indexPart}${
      concurrently ? " CONCURRENTLY" : ""
    } IF NOT EXISTS "${name}" ON ${tableNameWithSchema} USING ${method} (${value})${
      Object.keys(withMap!).length !== 0
        ? ` WITH (${reverseLogic(withMap!)})`
        : ""
    }${where ? ` WHERE ${where}` : ""};`;
  }
}

class CreateMySqlIndexConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_index" && dialect === "mysql";
  }

  convert(statement: JsonCreateIndexStatement): string {
    // should be changed
    const { name, columns, isUnique } = MySqlSquasher.unsquashIdx(
      statement.data,
    );
    const indexPart = isUnique ? "UNIQUE INDEX" : "INDEX";

    const uniqueString = columns
      .map((it) => {
        return statement.internal?.indexes
          ? statement.internal?.indexes[name]?.columns[it]?.isExpression
            ? it
            : `\`${it}\``
          : `\`${it}\``;
      })
      .join(",");

    const tableNameWithSchema = statement.schema
      ? `\`${statement.schema}\`.\`${statement.tableName}\``
      : `\`${statement.tableName}\``;

    return `CREATE ${indexPart} ${name} ON ${tableNameWithSchema} (${uniqueString});`;
  }
}

class CreateSqliteIndexConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_index" && dialect === "sqlite";
  }

  convert(statement: JsonCreateIndexStatement): string {
    // should be changed
    const { name, columns, isUnique, where } = SQLiteSquasher.unsquashIdx(
      statement.data,
    );
    // // since postgresql 9.5
    const indexPart = isUnique ? "UNIQUE INDEX" : "INDEX";
    const whereStatement = where ? ` WHERE ${where}` : "";
    const uniqueString = columns
      .map((it) => {
        return statement.internal?.indexes
          ? statement.internal?.indexes[name]?.columns[it]?.isExpression
            ? it
            : `\`${it}\``
          : `\`${it}\``;
      })
      .join(",");
    return `CREATE ${indexPart} \`${name}\` ON \`${statement.tableName}\` (${uniqueString})${whereStatement};`;
  }
}

class PgCreateSchemaConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_schema" && dialect === "postgresql";
  }

  convert(statement: JsonCreateSchema) {
    const { name } = statement;
    return `CREATE SCHEMA "${name}";\n`;
  }
}

class MySqlCreateSchemaConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_schema" && dialect === "mysql";
  }

  convert(statement: JsonCreateSchema) {
    const { name } = statement;
    return `CREATE SCHEMA \`${name}\`;\n`;
  }
}

class PgCreateViewConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "create_view" && dialect === "postgresql";
  }

  convert(st: JsonCreatePgViewStatement) {
    const {
      definition,
      name: viewName,
      schema,
      with: withOption,
      materialized,
      withNoData,
      tablespace,
      using,
    } = st;

    const name = schema ? `"${schema}"."${viewName}"` : `"${viewName}"`;

    let statement = materialized
      ? `CREATE MATERIALIZED VIEW ${name}`
      : `CREATE VIEW ${name}`;

    if (using) statement += ` USING "${using}"`;

    const options: string[] = [];
    if (withOption) {
      statement += ` WITH (`;

      Object.entries(withOption).forEach(([key, value]) => {
        if (typeof value === "undefined") return;

        options.push(`${key.snake_case()} = ${value}`);
      });

      statement += options.join(", ");

      statement += `)`;
    }

    if (tablespace) statement += ` TABLESPACE ${tablespace}`;

    statement += ` AS (${definition})`;

    if (withNoData) statement += ` WITH NO DATA`;

    statement += `;`;

    return statement;
  }
}

class MySqlCreateViewConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return statement.type === "mysql_create_view" && dialect === "mysql";
  }

  convert(st: JsonCreateMySqlViewStatement) {
    const {
      definition,
      name: viewName,
      schema,
      algorithm,
      sqlSecurity,
      withCheckOption,
      replace,
    } = st;

    const name = schema ? `\`${schema}\`.\`${viewName}\`` : `\`${viewName}\``;

    let statement = `CREATE `;
    statement += replace ? `OR REPLACE ` : "";
    statement += algorithm ? `ALGORITHM = ${algorithm}\n` : "";
    statement += sqlSecurity ? `SQL SECURITY ${sqlSecurity}\n` : "";
    statement += `VIEW ${name} AS (${definition})`;
    statement += withCheckOption
      ? `\nWITH ${withCheckOption} CHECK OPTION`
      : "";

    statement += ";";

    return statement;
  }
}

class SqliteCreateViewConvertor extends Convertor {
  can(statement: JsonStatement, dialect: Dialect): boolean {
    return (
      statement.type === "sqlite_create_view" &&
      (dialect === "sqlite" || dialect === "turso")
    );
  }

  convert(st: JsonCreateSqliteViewStatement) {
    const { definition, name } = st;

    return `CREATE VIEW \`${name}\` AS ${definition};`;
  }
}

const convertors: Convertor[] = [];

// table
convertors.push(new PgCreateTableConvertor());
convertors.push(new MySqlCreateTableConvertor());
convertors.push(new SQLiteCreateTableConvertor());

// enum
convertors.push(new CreateTypeEnumConvertor());

// sequence
convertors.push(new CreatePgSequenceConvertor());

// index
convertors.push(new CreatePgIndexConvertor());
convertors.push(new CreateMySqlIndexConvertor());
convertors.push(new CreateSqliteIndexConvertor());

// foreign key
convertors.push(new PgCreateForeignKeyConvertor());
convertors.push(new MySqlCreateForeignKeyConvertor());

// schema
convertors.push(new PgCreateSchemaConvertor());
convertors.push(new MySqlCreateSchemaConvertor());

// unique constraint
convertors.push(new PgAlterTableAddUniqueConstraintConvertor());
convertors.push(new MySQLAlterTableAddUniqueConstraintConvertor());

// composite primary key
convertors.push(new PgAlterTableCreateCompositePrimaryKeyConvertor());
convertors.push(new MySqlAlterTableCreateCompositePrimaryKeyConvertor());

// view
convertors.push(new PgCreateViewConvertor());
convertors.push(new MySqlCreateViewConvertor());
convertors.push(new SqliteCreateViewConvertor());

// enable rls
convertors.push(new PgEnableRlsConvertor());

// roles
convertors.push(new PgCreateRoleConvertor());

// policies
convertors.push(new PgCreatePolicyConvertor());
convertors.push(new PgCreateIndPolicyConvertor());

export const generateSql = (statements: JsonStatement[], dialect: Dialect) => {
  const result = statements
    .flatMap((statement) => {
      const filtered = convertors.filter((it) => {
        return it.can(statement, dialect);
      });

      const convertor = filtered.length === 1 ? filtered[0] : undefined;

      if (!convertor) {
        return "";
      }

      return convertor.convert(statement);
    })
    .filter((it) => it !== "");

  return result;
};
