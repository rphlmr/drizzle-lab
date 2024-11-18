import {
  getViewConfig,
  type AnyMySqlTable,
  type MySqlSchema,
  type MySqlView,
  getTableConfig,
} from "drizzle-orm/mysql-core";

import { DrizzleLab } from "../../extensions/symbols.ts";
import type { DrizzleSchema } from "../../internal/global.ts";
import { importModule } from "../../internal/import-module.node.ts";
import type {
  DrizzleRelation,
  TableRelationConfig,
} from "../../internal/relations.ts";
import { extractTablesRelationsConfig } from "../../internal/relations.ts";
import {
  schemaToDrizzleObjects,
  type DrizzleObjects,
} from "../serializer/drizzle-objects.ts";

/**
 * Import the Drizzle schema and extract the Drizzle objects.
 * @param paths - The path or array of paths to the schema file(s)
 * @returns Drizzle objects
 * @node-only - This function is not supported in the browser.
 */
export async function importFromFiles(
  paths: string[],
): Promise<DrizzleObjects> {
  const tables: AnyMySqlTable[] = [];
  const schemas: MySqlSchema[] = [];
  const views: MySqlView[] = [];
  const relations: TableRelationConfig[] = [];
  const drizzleRelations: DrizzleRelation[] = [];

  for (let i = 0; i < paths.length; i++) {
    const module: DrizzleSchema = await importModule(`${paths[i]}`);
    const parsedSchema = schemaToDrizzleObjects(module);

    tables.push(...parsedSchema.tables);
    views.push(...parsedSchema.views);
    schemas.push(...parsedSchema.schemas);
    relations.push(...parsedSchema.relations);
    drizzleRelations.push(...parsedSchema[DrizzleLab].drizzleRelations);
  }

  // when we have splitted schema files and or relations we need to reconsolidate the relations
  relations.push(
    ...extractTablesRelationsConfig({
      ...tables.reduce((acc, table) => {
        const tableConfig = getTableConfig(table);
        acc[tableConfig.name] = table;
        return acc;
      }, {}),
      ...drizzleRelations,
    }),
  );

  const uniqueTables = Array.from(
    new Map(
      tables.map((table) => [getTableConfig(table).name, table]),
    ).values(),
  );

  const uniqueSchemas = Array.from(
    new Map(schemas.map((schema) => [schema.schemaName, schema])).values(),
  );

  const uniqueViews = Array.from(
    new Map(views.map((view) => [getViewConfig(view).name, view])).values(),
  );

  const uniqueRelations = Array.from(
    new Map(relations.map((rel) => [rel.dbName, rel])).values(),
  );

  return {
    tables: uniqueTables,
    schemas: uniqueSchemas,
    views: uniqueViews,
    relations: uniqueRelations,
  };
}
