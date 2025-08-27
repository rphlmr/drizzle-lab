import { z } from "zod";

export const DialectSchema = z.enum(["postgresql", "sqlite"], {
  required_error: "Dialect is required",
});

export type Dialect = z.infer<typeof DialectSchema>;

export const dialects = DialectSchema.options;

export function asDialect(dialect: Dialect) {
  return dialect;
}

const PresetManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export type PresetManifest = z.infer<typeof PresetManifestSchema>;

export function getPresetsManifest() {
  const imports = import.meta.glob("./dialects/*/presets/*/manifest.json", { eager: true });
  const presetsManifest: Record<Dialect, PresetManifest[]> = {
    postgresql: [],
    sqlite: [],
  };

  for (const path in imports) {
    const [, , $dialect, , $id] = path.split("/");
    const dialect = DialectSchema.parse($dialect);
    const manifest = PresetManifestSchema.parse({
      id: $id,
      ...(imports[path] || {}),
    });

    presetsManifest[dialect].push(manifest);
  }

  return presetsManifest;
}

const DynamicImportSchema = z.object({
  default: z.string(),
});

export const playgroundFileNames = [
  "index.ts",
  "schema.ts",
  "utils.ts",
  "db.ts",
  "seed.ts",
  "__internal__.ts",
] as const;

export type PlaygroundFileName = (typeof playgroundFileNames)[number];

export type PlaygroundFileTree = Record<PlaygroundFileName, string>;

type PresetFileTree = Prettify<
  Omit<PlaygroundFileTree, "db.ts" | "utils.ts" | "seed.ts" | "__internal__.ts"> &
    Pick<Partial<PlaygroundFileTree>, "utils.ts" | "seed.ts">
>;

export type UserPlaygroundFileTree = PresetFileTree;

export type UserPlaygroundFileName = keyof UserPlaygroundFileTree;

export function asFileName(fileName: UserPlaygroundFileName) {
  return fileName;
}

export async function getPresetFiles(dialect: Dialect, presetId: string): Promise<PresetFileTree> {
  const [index, schema, utils, seed] = await Promise.allSettled([
    import(`./dialects/${dialect}/presets/${presetId}/index.ts?raw`),
    import(`./dialects/${dialect}/presets/${presetId}/schema.ts?raw`),
    import(`./dialects/${dialect}/presets/${presetId}/utils.ts?raw`),
    import(`./dialects/${dialect}/presets/${presetId}/seed.ts?raw`),
  ]);

  return {
    "index.ts": index.status === "fulfilled" ? DynamicImportSchema.parse(index.value).default : "",
    "schema.ts": schema.status === "fulfilled" ? DynamicImportSchema.parse(schema.value).default : "",
    "utils.ts": utils.status === "fulfilled" ? DynamicImportSchema.parse(utils.value).default : undefined,
    "seed.ts": seed.status === "fulfilled" ? DynamicImportSchema.parse(seed.value).default : undefined,
  };
}

export async function getCoreFiles(dialect: Dialect): Promise<PlaygroundFileTree> {
  const [index, schema, utils, seed, db, tools] = await Promise.all([
    import(`./dialects/${dialect}/core/index.ts?raw`),
    import(`./dialects/${dialect}/core/schema.ts?raw`),
    import(`./dialects/${dialect}/core/utils.ts?raw`),
    import(`./dialects/${dialect}/core/seed.ts?raw`),
    import(`./dialects/${dialect}/core/db.ts?raw`),
    import("./tools/index.ts?raw"),
  ]);

  return {
    "index.ts": DynamicImportSchema.parse(index).default,
    "schema.ts": DynamicImportSchema.parse(schema).default,
    "utils.ts": DynamicImportSchema.parse(utils).default,
    "seed.ts": DynamicImportSchema.parse(seed).default,
    "db.ts": DynamicImportSchema.parse(db).default,
    "__internal__.ts": DynamicImportSchema.parse(tools).default,
  };
}

export type TypeFile = {
  filePath: string;
  content: string;
};

export function getRegistryManifest() {
  return import("~/registry/dist/manifest.json");
}

export async function getDrizzleVersion() {
  return (await getRegistryManifest()).version;
}
