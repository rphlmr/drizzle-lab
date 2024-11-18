import {
  getMaterializedViewConfig,
  getTableConfig,
  getViewConfig,
} from "drizzle-orm/pg-core";
import type {
  PgPolicy,
  PgRole,
  PgSchema,
  PgMaterializedView,
  PgView,
  PgSequence,
  AnyPgTable,
  PgEnum,
} from "drizzle-orm/pg-core";

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

// fork: drizzle-kit/src/serializer/pgImports.ts

/**
 * Import the Drizzle schema and extract the Drizzle objects.
 * @param paths - The path or array of paths to the schema file(s)
 * @returns Drizzle objects
 * @node-only - This function is not supported in the browser.
 */
export async function importFromFiles(
  paths: string[],
): Promise<DrizzleObjects> {
  const tables: AnyPgTable[] = [];
  const enums: PgEnum<any>[] = [];
  const schemas: PgSchema[] = [];
  const sequences: PgSequence[] = [];
  const views: PgView[] = [];
  const roles: PgRole[] = [];
  const policies: PgPolicy[] = [];
  const matViews: PgMaterializedView[] = [];
  const relations: TableRelationConfig[] = [];
  const drizzleRelations: DrizzleRelation[] = [];

  for (let i = 0; i < paths.length; i++) {
    const module: DrizzleSchema = await importModule(`${paths[i]}`);
    const parsedSchema = schemaToDrizzleObjects(module);

    tables.push(...parsedSchema.tables);
    enums.push(...parsedSchema.enums);
    schemas.push(...parsedSchema.schemas);
    sequences.push(...parsedSchema.sequences);
    views.push(...parsedSchema.views);
    matViews.push(...parsedSchema.matViews);
    roles.push(...parsedSchema.roles);
    policies.push(...parsedSchema.policies);
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
      ...drizzleRelations.reduce((acc, rel, index) => {
        acc[`rel-${index}`] = rel;
        return acc;
      }, {}),
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

  const uniqueEnums = Array.from(
    new Map(enums.map((en) => [en.name, en])).values(),
  );

  const uniqueSequences = Array.from(
    new Map(sequences.map((seq) => [seq.seqName, seq])).values(),
  );

  const uniqueViews = Array.from(
    new Map(views.map((view) => [getViewConfig(view).name, view])).values(),
  );

  const uniqueMatViews = Array.from(
    new Map(
      matViews.map((matView) => [
        getMaterializedViewConfig(matView).name,
        matView,
      ]),
    ).values(),
  );

  const uniqueRoles = Array.from(
    new Map(roles.map((role) => [role.name, role])).values(),
  );

  const uniquePolicies = Array.from(
    new Map(policies.map((policy) => [policy.name, policy])).values(),
  );

  const uniqueRelations = Array.from(
    new Map(relations.map((rel) => [rel.dbName, rel])).values(),
  );

  return {
    tables: uniqueTables,
    enums: uniqueEnums,
    schemas: uniqueSchemas,
    sequences: uniqueSequences,
    views: uniqueViews,
    matViews: uniqueMatViews,
    roles: uniqueRoles,
    policies: uniquePolicies,
    relations: uniqueRelations,
  };
}
