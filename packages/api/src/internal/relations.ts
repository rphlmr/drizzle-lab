import { is } from "drizzle-orm";
import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  Relations as DrizzleRelation,
} from "drizzle-orm/relations";
import { object, enum as enumType, string, type TypeOf } from "zod";

import type { DrizzleSchema } from "./global";

export type TableRelationConfig = ReturnType<
  typeof extractTablesRelationsConfig
>[number];

export function extractTablesRelationsConfig(schema: DrizzleSchema) {
  return Object.values(
    extractTablesRelationalConfig(schema, createTableRelationsHelpers).tables,
  );
}

export type { DrizzleRelation };

export function isRelation(value: unknown) {
  return is(value, DrizzleRelation);
}

/* lab extension */
export const relation = object({
  type: enumType(["many", "one"]),
  fieldName: string(),
  relationName: string(),
  referencedTableName: string(),
}).strict();

/* lab extension */
export type Relation = TypeOf<typeof relation>;
