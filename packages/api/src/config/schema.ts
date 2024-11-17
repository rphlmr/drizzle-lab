import { enum as enumType, object, string, union, boolean } from "zod";

const dialects = ["postgresql", "mysql", "sqlite", "turso"] as const;
const dialect = enumType(dialects);

export type Dialect = (typeof dialects)[number];
export const casingTypes = ["snake_case", "camelCase"] as const;
export const casingType = enumType(casingTypes);
export type CasingType = (typeof casingTypes)[number];

export const providers = ["supabase", "neon"] as const;
export const provider = enumType(providers);
export type Provider = (typeof providers)[number];

export const projectId = string().optional().default("visualizer");

export const configCommonSchema = object({
  dialect: dialect,
  schema: union([string(), string().array()])
    .optional()
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : [])),
  out: string().optional(),
  casing: casingType.optional(),
  schemaFilter: union([string(), string().array()]).optional(),
  entities: object({
    roles: boolean()
      .or(
        object({
          provider: provider.optional(),
          include: string().array().optional(),
          exclude: string().array().optional(),
        }),
      )
      .optional()
      .default(false),
  }).optional(),
  /* lab extension */
  lab: object({ projectId }).optional().default({ projectId: "" }),
}).passthrough();
