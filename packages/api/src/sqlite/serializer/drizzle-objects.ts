import { is } from "drizzle-orm";
import {
  SQLiteTable,
  SQLiteView,
  type AnySQLiteTable,
} from "drizzle-orm/sqlite-core";

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
  const tables: AnySQLiteTable[] = [];
  const views: SQLiteView[] = [];

  const relations = extractTablesRelationsConfig(drizzleSchema);
  const drizzleRelations: DrizzleRelation[] = [];

  Object.values(drizzleSchema).forEach((t) => {
    if (is(t, SQLiteTable)) {
      tables.push(t);
    }

    if (is(t, SQLiteView)) {
      views.push(t);
    }

    if (isRelation(t)) {
      drizzleRelations.push(t);
    }
  });

  return {
    tables,
    views,
    relations,
    [DrizzleLab]: {
      drizzleRelations,
    },
  };
}
