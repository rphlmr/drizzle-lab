import { assertUnreachable, type Casing } from "../internal/global";
import "../internal/helpers";

const paramNameFor = (name: string, schema?: string) => {
  const schemaSuffix =
    schema && schema !== "public" ? `In${schema.capitalise()}` : "";
  return `${name}${schemaSuffix}`;
};

const escapeColumnKey = (value: string) => {
  if (/^(?![a-zA-Z_$][a-zA-Z0-9_$]*$).+$/.test(value)) {
    return `"${value}"`;
  }
  return value;
};

const withCasing = (value: string, casing: Casing) => {
  if (casing === "preserve") {
    return escapeColumnKey(value);
  }
  if (casing === "camel") {
    return escapeColumnKey(value.camelCase());
  }

  assertUnreachable(casing);
};

/**
 * Extract relations from snapshot and convert to TypeScript
 * @param snapshot - Drizzle snapshot
 * @param casing - Casing
 * @returns TypeScript
 */
export function relationsToTypeScript(
  snapshot: {
    tables: Record<
      string,
      {
        schema?: string;
        foreignKeys: Record<
          string,
          {
            name: string;
            tableFrom: string;
            columnsFrom: string[];
            tableTo: string;
            schemaTo?: string;
            columnsTo: string[];
            onUpdate?: string | undefined;
            onDelete?: string | undefined;
          }
        >;
      }
    >;
  },
  casing: Casing,
) {
  const imports: string[] = [];
  const tableRelations: Record<
    string,
    {
      name: string;
      type: "one" | "many";
      tableFrom: string;
      schemaFrom?: string;
      columnFrom: string;
      tableTo: string;
      schemaTo?: string;
      columnTo: string;
      relationName?: string;
    }[]
  > = {};

  Object.values(snapshot.tables).forEach((table) => {
    Object.values(table.foreignKeys).forEach((fk) => {
      const tableNameFrom = paramNameFor(fk.tableFrom, table.schema);
      const tableNameTo = paramNameFor(fk.tableTo, fk.schemaTo);
      const tableFrom = withCasing(tableNameFrom, casing);
      const tableTo = withCasing(tableNameTo, casing);
      const columnFrom = withCasing(fk.columnsFrom[0], casing);
      const columnTo = withCasing(fk.columnsTo[0], casing);

      imports.push(tableTo, tableFrom);

      // const keyFrom = `${schemaFrom}.${tableFrom}`;
      const keyFrom = tableFrom;

      if (!tableRelations[keyFrom]) {
        tableRelations[keyFrom] = [];
      }

      tableRelations[keyFrom].push({
        name: `o_${tableTo}`,
        type: "one",
        tableFrom,
        columnFrom,
        tableTo,
        columnTo,
      });

      // const keyTo = `${schemaTo}.${tableTo}`;
      const keyTo = tableTo;

      if (!tableRelations[keyTo]) {
        tableRelations[keyTo] = [];
      }

      tableRelations[keyTo].push({
        name: `m_${tableFrom}`,
        type: "many",
        tableFrom: tableTo,
        columnFrom: columnTo,
        tableTo: tableFrom,
        columnTo: columnFrom,
      });
    });
  });

  const uniqueImports = [...new Set(imports)];

  const importsTs = `import { relations } from "drizzle-orm/relations";\nimport { ${uniqueImports.join(
    ", ",
  )} } from "./schema";\n\n`;

  const relationStatements = Object.entries(tableRelations).map(
    ([table, relations]) => {
      const hasOne = relations.some((it) => it.type === "one");
      const hasMany = relations.some((it) => it.type === "many");

      // * change relation names if they are duplicated or if there are multiple relations between two tables
      const preparedRelations = relations.map(
        (relation, relationIndex, originArray) => {
          let name = relation.name;
          let relationName;
          const hasMultipleRelations = originArray.some(
            (it, originIndex) =>
              relationIndex !== originIndex && it.tableTo === relation.tableTo,
          );
          if (hasMultipleRelations) {
            relationName =
              relation.type === "one"
                ? `${relation.tableFrom}_${relation.columnFrom}_${relation.tableTo}_${relation.columnTo}`
                : `${relation.tableTo}_${relation.columnTo}_${relation.tableFrom}_${relation.columnFrom}`;
          }
          const hasDuplicatedRelation = originArray.some(
            (it, originIndex) =>
              relationIndex !== originIndex && it.name === relation.name,
          );
          if (hasDuplicatedRelation) {
            name = `${relation.name}_${relation.type === "one" ? relation.columnFrom : relation.columnTo}`;
          }
          return {
            ...relation,
            name,
            relationName,
          };
        },
      );

      const fields = preparedRelations.map((relation) => {
        if (relation.type === "one") {
          return `\t${relation.name}: one(${relation.tableTo}, {\n\t\tfields: [${relation.tableFrom}.${relation.columnFrom}],\n\t\treferences: [${relation.tableTo}.${relation.columnTo}]${
            relation.relationName
              ? `,\n\t\trelationName: "${relation.relationName}"`
              : ""
          }\n\t}),`;
        } else {
          return `\t${relation.name}: many(${relation.tableTo}${
            relation.relationName
              ? `, {\n\t\trelationName: "${relation.relationName}"\n\t}`
              : ""
          }),`;
        }
      });

      return `export const ${table}Relations = relations(${table}, ({${hasOne ? "one" : ""}${hasOne && hasMany ? ", " : ""}${hasMany ? "many" : ""}}) => ({\n${fields.join("\n")}\n}));`;
    },
  );

  return {
    file: importsTs + relationStatements.join("\n\n"),
  };
}
