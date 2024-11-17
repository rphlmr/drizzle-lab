import { is } from "drizzle-orm";
import {
  MySqlSchema,
  MySqlTable,
  MySqlView,
  type AnyMySqlTable,
} from "drizzle-orm/mysql-core";

import { DrizzleLab } from "../../extensions/symbols";
import type { DrizzleSchema } from "../../internal/global";
import type { DrizzleRelation } from "../../internal/relations";
import {
  extractTablesRelationsConfig,
  isRelation,
} from "../../internal/relations";

export type DrizzleObjects = Omit<
  ReturnType<typeof schemaToDrizzleObjects>,
  typeof DrizzleLab
>;

/**
 * Map the Drizzle objects from the Drizzle schema.
 * @param drizzleSchema - The Drizzle schema to map the objects from.
 * @returns Drizzle objects
 */
export function schemaToDrizzleObjects(drizzleSchema: DrizzleSchema) {
  const tables: AnyMySqlTable[] = [];
  const schemas: MySqlSchema[] = [];
  const views: MySqlView[] = [];

  const relations = extractTablesRelationsConfig(drizzleSchema);
  const drizzleRelations: DrizzleRelation[] = [];

  Object.values(drizzleSchema).forEach((t) => {
    if (is(t, MySqlTable)) {
      tables.push(t);
    }
    if (is(t, MySqlSchema)) {
      schemas.push(t);
    }
    if (is(t, MySqlView)) {
      views.push(t);
    }

    if (isRelation(t)) {
      drizzleRelations.push(t);
    }
  });

  return {
    tables,
    schemas,
    views,
    relations,
    [DrizzleLab]: {
      drizzleRelations,
    },
  };
}
