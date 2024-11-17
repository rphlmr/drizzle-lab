import { is } from "drizzle-orm";
import {
  type PgMaterializedView,
  PgPolicy,
  type PgView,
  type PgSequence,
  type AnyPgTable,
  type PgEnum,
  PgRole,
  isPgEnum,
  PgSchema,
  PgTable,
  isPgView,
  isPgMaterializedView,
  isPgSequence,
} from "drizzle-orm/pg-core";

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
  const tables: AnyPgTable[] = [];
  const enums: PgEnum<any>[] = [];
  const schemas: PgSchema[] = [];
  const sequences: PgSequence[] = [];
  const roles: PgRole[] = [];
  const policies: PgPolicy[] = [];
  const views: PgView[] = [];
  const matViews: PgMaterializedView[] = [];

  const relations = extractTablesRelationsConfig(drizzleSchema);
  const drizzleRelations: DrizzleRelation[] = [];

  Object.values(drizzleSchema).forEach((t) => {
    if (isPgEnum(t)) {
      enums.push(t);
      return;
    }
    if (is(t, PgTable)) {
      tables.push(t);
    }

    if (is(t, PgSchema)) {
      schemas.push(t);
    }

    if (isPgView(t)) {
      views.push(t);
    }

    if (isPgMaterializedView(t)) {
      matViews.push(t);
    }

    if (isPgSequence(t)) {
      sequences.push(t);
    }

    if (is(t, PgRole)) {
      roles.push(t);
    }

    if (is(t, PgPolicy)) {
      policies.push(t);
    }

    if (isRelation(t)) {
      drizzleRelations.push(t);
    }
  });

  return {
    tables,
    enums,
    schemas,
    sequences,
    views,
    matViews,
    roles,
    policies,
    relations,
    [DrizzleLab]: {
      drizzleRelations,
    },
  };
}
