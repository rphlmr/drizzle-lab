import type { PartialConfig } from "@drizzle-lab/api/config/loader.node";
import { loader, type Monaco } from "@monaco-editor/react";
import { createId } from "@paralleldrive/cuid2";
import { shikiToMonaco } from "@shikijs/monaco";
import { createSkyInspector } from "@statelyai/inspect";
import { eq } from "drizzle-orm";
import type { IDisposable, editor as MonacoEditor } from "monaco-editor";
import * as typescriptParser from "prettier/parser-typescript";
import * as prettierEstreePlugin from "prettier/plugins/estree";
import * as prettier from "prettier/standalone";
import {
  type ActorRefFrom,
  type EventFromLogic,
  type ExtractEvent,
  assertEvent,
  enqueueActions,
  forwardTo,
  fromCallback,
  fromPromise,
  not,
  raise,
  setup,
} from "xstate";

import { localDb } from "~/database/.client/db";
import { anonymousCreatorId } from "~/database/shared";
import type { Playground, PlaygroundId, UserId } from "~/database/types";
import {
  getCoreFiles,
  getRegistryManifest,
  playgroundFileNames,
  type UserPlaygroundFileName,
  type PlaygroundFileName,
  type PlaygroundFileTree,
  type Dialect,
  type TypeFile,
} from "~/registry";
import { PlaygroundTools } from "~/registry/tools";
import { isQueryLog } from "~/registry/utils/query-logger";
import { assertNonNull } from "~/utils/assert";
import {
  type InvokeFailure,
  type SenderRef,
  actorNotProvided,
  makeInvokeFailure,
} from "~/utils/machine";

import { highlighter } from "./highlighter";

type AssetStatus = "loaded" | "missing";

/* -------------------------------------------------------------------------- */
/*                                   Editor;                                  */
/* -------------------------------------------------------------------------- */

declare global {
  interface Window {
    monacoInstance: Monaco | null;
  }
}

let _loadMonaco: Promise<Monaco> | null = null;

export async function loadMonaco() {
  if (window.monacoInstance) {
    return window.monacoInstance;
  }

  if (!_loadMonaco) {
    _loadMonaco = loader.init().then((monaco) => {
      window.monacoInstance = monaco;
      return monaco;
    });
  }

  return _loadMonaco;
}

const initMonaco = fromPromise(async () => {
  if (window.monacoInstance) {
    return;
  }

  const monaco = await loadMonaco();

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    diagnosticCodesToIgnore: [
      // no top-level await
      1378,
    ],
  });

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    /* Base Options: */
    esModuleInterop: true,
    skipDefaultLibCheck: true,
    target: monaco.languages.typescript.ScriptTarget.Latest,
    allowJs: true,
    isolatedModules: true,
    /* Strictness */
    strict: true,
    /* If NOT transpiling with TypeScript: */
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    // it is expected to be CommonJS, in order to make it easy to fake imports
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: false,
  });
  monaco.languages.typescript.typescriptDefaults.getExtraLibs();
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
  // Remove this default keybinding to reuse it for something else
  monaco.editor.addKeybindingRules([
    {
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
      command: null,
    },
  ]);

  // set prettier as default formatter for typescript
  monaco.languages.registerDocumentFormattingEditProvider("typescript", {
    async provideDocumentFormattingEdits(model) {
      const text = await prettier.format(model.getValue(), {
        parser: "typescript",
        plugins: [typescriptParser, prettierEstreePlugin],
      });

      return [
        {
          text,
          range: model.getFullModelRange(),
        },
      ];
    },
  });

  for (const lang of highlighter.getLoadedLanguages()) {
    monaco.languages.register({ id: lang });
  }

  shikiToMonaco(highlighter, monaco);
  window.monacoInstance = monaco;
});

function getMonacoInstance() {
  if (window.monacoInstance) {
    return window.monacoInstance;
  }

  throw new Error("Monaco instance not initialized. It should not happen.");
}

function getEditor() {
  const monaco = getMonacoInstance();
  const editor = monaco.editor.getEditors().at(0);

  if (!editor) {
    throw new Error("No editor found");
  }

  return editor;
}

function getFile(fileName: string) {
  const monaco = getMonacoInstance();
  const uri = monaco.Uri.parse(`file:///${fileName}`);
  const file = monaco.editor.getModel(uri);

  return file;
}

type EditorFile = NonNullable<ReturnType<typeof getFile>>;

/**
 * Force a fake edit to trigger a diagnostic
 *
 * It's a bit hacky but it works. Any better solution?
 */
function triggerDiagnostic(file: EditorFile) {
  file.applyEdits(
    file.applyEdits(
      [
        {
          text: " ",
          forceMoveMarkers: true,
          range: {
            startLineNumber: 0,
            startColumn: 0,
            endColumn: 0,
            endLineNumber: 0,
          },
        },
      ],
      true,
    ),
  );
}

function getFileOrThrow(fileName: string, withDiagnostic?: boolean) {
  const file = getFile(fileName);

  if (!file) {
    throw new Error(`File ${fileName} not found`);
  }

  if (withDiagnostic) {
    triggerDiagnostic(file);
  }

  return file;
}

function loadFile(fileName: string, content: string) {
  const monaco = getMonacoInstance();
  const existingFile = getFile(fileName);

  if (existingFile) {
    existingFile.setValue(content);
    return;
  }

  monaco.editor.createModel(
    content,
    "typescript",
    monaco.Uri.parse(`file:///${fileName}`),
  );
}

type EditorAsset = {
  types: Array<TypeFile> | null;
  coreFiles: PlaygroundFileTree | null;
};

const editorAsset: EditorAsset = {
  types: null,
  coreFiles: null,
};

type EditorMachineInput = {
  fileTree: Playground["content"];
  dialect: Playground["dialect"];
};

type EditorMachine = typeof EditorMachine;

type EditorEvent = EventFromLogic<EditorMachine>;

export const EditorMachine = setup({
  types: {
    input: {} as EditorMachineInput,
    context: {} as EditorMachineInput & {
      assetStatus: {
        types: AssetStatus;
        coreFiles: AssetStatus;
      };
      tab: {
        current: UserPlaygroundFileName;
        previous: UserPlaygroundFileName | null;
      };
      viewStates: Record<
        UserPlaygroundFileName,
        MonacoEditor.ICodeEditorViewState | null
      >;
      setupError: InvokeFailure | null;
      error: InvokeFailure | null;
    },
    events: {} as
      | { type: "editor.file.open"; fileName: UserPlaygroundFileName }
      | { type: "editor.file.format" }
      | { type: "editor.file.change"; content: string | undefined },
    tags: {} as
      | "setup"
      | "starting"
      | "starting:boot"
      | "starting:types"
      | "starting:prepare"
      | "start_failed"
      | "started",
  },
  actors: {
    initMonaco,
    fetchTypes: fromPromise(async () => {
      const manifest = await getRegistryManifest();

      editorAsset.types = manifest.types;
    }),
    setTypes: fromPromise(async () => {
      assertNonNull(editorAsset.types);

      const monaco = getMonacoInstance();
      const types = editorAsset.types.map((type) => ({
        content: type.content,
        filePath: `file:///${type.filePath}`,
      }));

      monaco.languages.typescript.typescriptDefaults.setExtraLibs(types);
    }),
    fetchCoreFiles: fromPromise(
      async ({ input }: { input: { dialect: Dialect } }) => {
        const { dialect } = input;
        editorAsset.coreFiles = await getCoreFiles(dialect);
      },
    ),
    loadPlaygroundFiles: fromPromise(
      async ({ input }: { input: { fileTree: Playground["content"] } }) => {
        assertNonNull(editorAsset.coreFiles);

        const content = { ...editorAsset.coreFiles, ...input.fileTree };

        for (const fileName in content) {
          loadFile(fileName, content[fileName as keyof typeof content]);
        }
      },
    ),
    openFile: fromPromise(
      async ({
        input,
      }: {
        input: {
          fileName: string;
          viewState: MonacoEditor.ICodeEditorViewState | null;
        };
      }) => {
        const { fileName, viewState } = input;
        const editor = getEditor();
        const file = getFileOrThrow(fileName, true);
        const previousTabViewState = editor.saveViewState();

        editor.setModel(file);
        editor.restoreViewState(viewState);

        return previousTabViewState;
      },
    ),
    formatFile: fromPromise(async () => {
      const editor = getEditor();
      editor.getAction("editor.action.formatDocument")?.run();
    }),
    peekViewWatcher: fromCallback(() => {
      const monaco = getMonacoInstance();

      let peekViewListener: IDisposable;

      const monacoListener = monaco.editor.onDidCreateEditor((peekView) => {
        if (monaco.editor.getEditors().length <= 1) {
          return;
        }

        peekViewListener?.dispose();

        peekViewListener = peekView.onDidChangeModel(() => {
          peekView.updateOptions({ readOnly: true, domReadOnly: true });
        });
      });

      return () => {
        peekViewListener?.dispose();
        monacoListener.dispose();
      };
    }),
  },
  actions: {
    setError: enqueueActions(({ enqueue, event }) => {
      enqueue.assign({
        error: makeInvokeFailure(event),
      });
    }),
    setSetupError: enqueueActions(({ enqueue, event }) => {
      enqueue.assign({
        setupError: makeInvokeFailure(event),
      });
    }),
    clearError: enqueueActions(({ enqueue }) => {
      enqueue.assign({
        error: null,
      });
    }),
    setAssetLoaded: enqueueActions(
      (
        { context, enqueue },
        params: { asset: keyof typeof context.assetStatus },
      ) => {
        enqueue.assign({
          assetStatus: {
            ...context.assetStatus,
            [params.asset]: "loaded",
          },
        });
      },
    ),
    openFile: enqueueActions(({ enqueue, event, context }) => {
      assertEvent(event, "editor.file.open");
      enqueue.assign({
        tab: {
          current: event.fileName,
          previous: context.tab.current,
        },
      });
    }),
    openPreviousFile: enqueueActions(({ enqueue, context }) => {
      enqueue.assign({
        tab: {
          current: context.tab.previous || "index.ts",
          previous: null,
        },
      });
    }),
    updateFile: enqueueActions(({ enqueue, event, context }) => {
      assertEvent(event, "editor.file.change");
      const { content } = event;
      const { fileTree, tab } = context;

      enqueue.assign({
        fileTree: {
          ...fileTree,
          [tab.current]: content,
        },
      });
    }),
  },
  guards: {
    areAssetsLoaded: ({ context }) =>
      Object.values(context.assetStatus).every((status) => status === "loaded"),
    hasSetupError: ({ context }) => context.setupError !== null,
  },
}).createMachine({
  id: "editor",
  context: ({ input }) => {
    return {
      fileTree: input.fileTree,
      dialect: input.dialect,
      drizzleVersion: null,
      assetStatus: {
        types: "missing",
        coreFiles: "missing",
      },
      tab: {
        current: "index.ts",
        previous: null,
      },
      viewStates: {
        "index.ts": null,
        "schema.ts": null,
        "utils.ts": null,
        "seed.ts": null,
      },
      setupError: null,
      error: null,
    };
  },
  initial: "Setup",
  states: {
    Setup: {
      tags: "setup",
      initial: "Starting",
      states: {
        Starting: {
          tags: "starting",
          always: {
            guard: "hasSetupError",
            target: "Failed",
          },
          type: "parallel",
          states: {
            "Prepare editor": {
              initial: "Initializing monaco",
              states: {
                "Initializing monaco": {
                  tags: "starting:boot",
                  invoke: {
                    src: "initMonaco",
                    onDone: "Waiting for assets",
                    onError: {
                      actions: "setSetupError",
                    },
                  },
                },
                "Waiting for assets": {
                  tags: "starting:types",
                  always: {
                    target: "Setting types",
                    guard: "areAssetsLoaded",
                  },
                },
                "Setting types": {
                  tags: "starting:types",
                  invoke: {
                    src: "setTypes",
                    onDone: "Loading playground files",
                    onError: {
                      actions: "setSetupError",
                    },
                  },
                },
                "Loading playground files": {
                  tags: "starting:prepare",
                  invoke: {
                    src: "loadPlaygroundFiles",
                    input: ({ context }) => ({
                      fileTree: context.fileTree,
                    }),
                    onDone: "Done",
                    onError: {
                      actions: "setSetupError",
                    },
                  },
                },
                Done: {
                  type: "final",
                },
              },
            },
            "Load assets": {
              initial: "Fetching",
              states: {
                Fetching: {
                  always: {
                    target: "Done",
                    guard: "areAssetsLoaded",
                  },
                  invoke: [
                    {
                      src: "fetchTypes",
                      onDone: {
                        actions: {
                          type: "setAssetLoaded",
                          params: {
                            asset: "types",
                          },
                        },
                      },
                      onError: {
                        actions: "setSetupError",
                      },
                    },
                    {
                      src: "fetchCoreFiles",
                      input: ({ context }) => ({
                        dialect: context.dialect,
                      }),
                      onDone: {
                        actions: {
                          type: "setAssetLoaded",
                          params: {
                            asset: "coreFiles",
                          },
                        },
                      },
                      onError: {
                        actions: "setSetupError",
                      },
                    },
                  ],
                },
                Done: {
                  type: "final",
                },
              },
            },
          },
          onDone: "#editor.Started",
        },
        Failed: {
          tags: "start_failed",
          type: "final",
        },
      },
    },
    Started: {
      tags: "started",
      on: {
        "editor.file.change": {
          actions: "updateFile",
        },
      },
      invoke: {
        id: "peekViewWatcher",
        src: "peekViewWatcher",
        onError: {
          actions: "setError",
        },
      },
      type: "parallel",
      states: {
        "Open file": {
          initial: "Idle",
          states: {
            Idle: {
              on: {
                "editor.file.open": "Opening file",
              },
            },
            "Opening file": {
              entry: ["clearError", "openFile"],
              invoke: {
                src: "openFile",
                input: ({ context }) => ({
                  fileName: context.tab.current,
                  viewState: context.viewStates[context.tab.current],
                }),
                onDone: {
                  target: "Idle",
                  actions: enqueueActions(({ enqueue, event, context }) => {
                    enqueue.assign({
                      viewStates: {
                        ...context.viewStates,
                        ...(context.tab.previous
                          ? { [context.tab.previous]: event.output }
                          : {}),
                      },
                    });
                  }),
                },
                onError: {
                  target: "Idle",
                  actions: ["setError", "openPreviousFile"],
                },
              },
            },
          },
        },
        "Format file": {
          initial: "Idle",
          states: {
            Idle: {
              on: {
                "editor.file.format": "Formatting file",
              },
            },
            "Formatting file": {
              entry: ["clearError"],
              invoke: {
                src: "formatFile",
                onDone: "Idle",
                onError: {
                  target: "Idle",
                  actions: "setError",
                },
              },
            },
          },
        },
      },
    },
  },
});

/* -------------------------------------------------------------------------- */
/*                              Playground runner                             */
/* -------------------------------------------------------------------------- */

function extractNodeModulesImports(file: string): string[] {
  const importRegex = /from\s+["']([^.~][^"']+)["']/g;
  const matches = [...file.matchAll(importRegex)];
  const excludeList = ["drizzle-orm/logger"];

  return [
    ...new Set(
      matches
        .map((match) => match[1])
        .filter((module) => !excludeList.includes(module)),
    ),
  ];
}

function autoDetectDialect(nodeModulesImports: string[]) {
  const nodeModules = new Set(nodeModulesImports);

  if (nodeModules.has("drizzle-orm/pg-core")) {
    return "postgresql" as const;
  }
  if (nodeModules.has("drizzle-orm/sqlite-core")) {
    return "sqlite" as const;
  }
  if (nodeModules.has("drizzle-orm/mysql-core")) {
    return "mysql" as const;
  }

  return undefined;
}
type NodeModules = Record<string, unknown>;

async function fetchNodeModules(
  nodeModulesImports: string[],
  dialect = autoDetectDialect(nodeModulesImports),
) {
  if (!dialect) {
    throw new Error(`Unsupported dialect ${dialect}`);
  }

  const imports = new Map<string, Promise<Record<string, unknown>>>([
    ["drizzle-orm", import("drizzle-orm")],
    ["drizzle-seed", import("drizzle-seed")],
    ["@drizzle-lab/api/pg", import("@drizzle-lab/api/pg")],
    ["@drizzle-lab/api/sqlite", import("@drizzle-lab/api/sqlite")],
  ]);

  // fine tune modules to import
  for (const module of new Set(nodeModulesImports)) {
    // special case for drizzle-orm sub-modules.
    // it's too hard to maintain sub modules list, so, we just reuse the drizzle-orm module reexport
    if (module.startsWith("drizzle-orm/")) {
      imports.set(module, imports.get("drizzle-orm")!);
    }

    if (module === "drizzle-zod" || module === "zod") {
      imports.set("drizzle-zod", import("drizzle-zod"));
      imports.set("zod", import("zod"));
    }

    if (module === "drizzle-valibot" || module === "valibot") {
      imports.set("drizzle-valibot", import("drizzle-valibot"));
      imports.set("valibot", import("valibot"));
    }
  }

  switch (dialect) {
    case "postgresql": {
      imports.set("drizzle-orm/pg-core", import("drizzle-orm/pg-core"));
      imports.set("drizzle-orm/pglite", import("drizzle-orm/pglite"));
      imports.set("@electric-sql/pglite", import("@electric-sql/pglite"));
      imports.set(
        "@electric-sql/pglite/vector",
        import("@electric-sql/pglite/vector"),
      );
      imports.set("drizzle-orm/supabase", import("drizzle-orm/supabase"));
      break;
    }
    case "sqlite": {
      imports.set("drizzle-orm/sqlite-core", import("drizzle-orm/sqlite-core"));
      imports.set("drizzle-orm/libsql", import("drizzle-orm/libsql"));
      imports.set("@libsql/client-wasm", import("@libsql/client-wasm"));
      break;
    }
    case "mysql": {
      imports.set("drizzle-orm/mysql-core", import("drizzle-orm/mysql-core"));
      break;
    }
  }

  const modules = await Promise.all(
    [...imports.entries()].map(async ([name, module]) => [name, await module]),
  );

  return Object.fromEntries(modules) as NodeModules;
}

function removeEsModuleProperty(content: string): string {
  const esModuleRegex =
    /Object\.defineProperty\(exports,\s*"__esModule",\s*\{\s*value:\s*true\s*\}\);/;
  return content.replace(esModuleRegex, "").trim();
}

function makeRequireAsync(content: string): string {
  return content.replace(/require\b/g, "await require");
}

type TsFileName = `${string}.ts`;
type TsToJS<T extends TsFileName> =
  `${T extends `${infer Base}.ts` ? Base : never}.js`;

async function transformTsFile<T extends TsFileName>(fileName: T) {
  const monaco = getMonacoInstance();
  const worker = await monaco.languages.typescript.getTypeScriptWorker();
  const file = getFileOrThrow(fileName);
  const client = await worker(file.uri);
  const result = await client.getEmitOutput(file.uri.toString());
  let content = result.outputFiles[0].text;

  content = removeEsModuleProperty(content);
  content = makeRequireAsync(content);

  return {
    fileName: fileName.replace(".ts", ".js") as TsToJS<T>,
    content,
    imports: extractNodeModulesImports(file.getValue()),
  };
}

async function getPlaygroundFiles() {
  const allFiles = await Promise.all(
    playgroundFileNames.map(async (fileName) => {
      const file = await transformTsFile(fileName);
      return [
        file.fileName,
        { content: file.content, imports: file.imports },
      ] as const;
    }),
  );

  const files = Object.fromEntries(allFiles) as Record<
    TsToJS<PlaygroundFileName>,
    { content: string; imports: string[] }
  >;

  const imports = Object.values(files).flatMap((file) => file.imports);

  return {
    files,
    imports,
  };
}

type JsFileName = `${string}.js`;

type JsFileSystem = Record<JsFileName, { content: string } | null>;

type FileImport = `./${string}`;

const isFileImport = (module: string): module is FileImport => {
  return module.startsWith("./");
};

type FileToImport<T extends string> =
  `./${T extends `${infer Base}.${string}` ? Base : never}`;

declare global {
  interface Window {
    moduleStack: Array<FileImport>;
  }
}

async function createModuleSystem<
  T extends JsFileSystem,
  K extends string = FileToImport<string & keyof T>,
>(files: T, nodeModules: NodeModules) {
  const cache: Map<K, unknown> = new Map();

  // Initialize a module stack.
  // It will be used to track the current module being executed so we can know which "file" log the output
  if (!window.moduleStack) {
    window.moduleStack = [];
  }

  async function $require(
    module: K,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (cache.has(module)) {
      return cache.get(module);
    }

    if (!isFileImport(module)) {
      return nodeModules[module];
    }

    const content = files[`${module.slice(2)}.js`]?.content;

    if (!content) {
      throw new Error(`Module ${module} not found`);
    }

    // Create a temporary cached value to handle circular dependencies
    const exports = {};
    cache.set(module, exports);

    // Push the current module to the stack
    window.moduleStack.push(module);

    await new Function(
      "require",
      "exports",
      Object.keys(args).join(","),
      `
        return (async function Module() {
          ${content}
        })();
      `,
    )((module: K) => $require(module, args), exports, ...Object.values(args));

    // Pop the module from the stack after execution
    window.moduleStack.pop();

    return exports;
  }

  async function importModule(fileName: K, args: Record<string, unknown> = {}) {
    // Clear the module stack before each run
    window.moduleStack = [];

    return new Function(
      "require",
      ` 
      return (async function run() {
          return await require();
        })();
      `,
    )(() => $require(fileName, args)) as Promise<{
      default?: unknown;
      [key: string]: unknown;
    }>;
  }

  return importModule;
}

export type SnapshotOutput = {
  fileName: BaseFileName<UserPlaygroundFileName> | undefined;
  type: "array" | "object" | "string" | "error";
  html: string;
  raw: unknown;
  id: string;
  time: number;
  isDebug: boolean;
};

function isPromise(value: unknown): value is Promise<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    "then" in value &&
    typeof value.then === "function"
  );
}

type BaseFileName<T extends string> = T extends `${infer Base}.${string}`
  ? Base
  : never;

function parseOutputs(
  fileName: BaseFileName<UserPlaygroundFileName> | undefined,
  ...outputs: unknown[]
) {
  if (outputs.length === 0) {
    return [];
  }

  return outputs
    .map((output) => {
      if (!output) {
        return;
      }

      let lang = "typescript";
      let type: SnapshotOutput["type"] = "string";
      let isDebug: boolean = false;

      if (isPromise(output)) {
        output = String(output);
      }

      if (typeof output === "object") {
        type = "object";
      }

      if (isQueryLog(output)) {
        const { sql, params } = output;
        isDebug = true;
        type = "string";
        lang = "sql";

        let paramIndex = 0;
        output = sql.replace(
          // match column names with $i or ? + placeholders
          /("(?:[^"]|"")*")|(\?|\$\d+)/g,
          (_, columnName) => {
            if (columnName) {
              return columnName;
            }
            if (paramIndex >= params.length) {
              throw new Error("Not enough parameters provided for the query?");
            }
            const param = params[paramIndex++];
            if (typeof param === "string") {
              return `'${param.replace(/'/g, "''")}'`; // Escape single quotes in strings
            }
            if (param == null) {
              return "NULL";
            }
            return param.toString();
          },
        );
      }

      if (Array.isArray(output)) {
        type = "array";
      }

      if (output instanceof Error) {
        type = "error";
        output = output.message;
      }

      const html = highlighter.codeToHtml(
        ["string", "error"].includes(type)
          ? String(output)
          : JSON.stringify(output, null, 2),
        {
          theme: "tokyo-night",
          lang,
        },
      );

      return {
        fileName,
        type,
        html,
        raw: output,
        id: createId(),
        time: Date.now(),
        isDebug,
      } satisfies SnapshotOutput;
    })
    .filter(Boolean);
}

type PlaygroundRunnerMachine = typeof PlaygroundRunnerMachine;

type PlaygroundRunnerEvent =
  | {
      type: "playgroundRunner.command.play";
    }
  | { type: "playgroundRunner.outputs.history.load"; index: number }
  | {
      type: "playgroundRunner.outputs.push";
      outputs: Array<SnapshotOutput>;
    };

/**
 * Custom playground runner machine
 *
 * It has known limitations:
 * - it doesn't support default import
 * - it doesn't support renamed named imports (`as` syntax)
 * - it doesn't support name conflicts (same name in different files)
 */
export const PlaygroundRunnerMachine = setup({
  types: {
    input: {} as { dialect: Dialect },
    context: {} as {
      setupError: InvokeFailure | null;
      dialect: Dialect;
      error: InvokeFailure | null;
      outputs: Array<SnapshotOutput>;
      history: Array<Array<SnapshotOutput>>;
    },
    events: {} as PlaygroundRunnerEvent,
    tags: {} as "setup" | "start_failed" | "idle" | "running",
  },
  actors: {
    initMonaco,
    play: fromPromise(
      async ({
        input,
      }: {
        input: {
          sender: SenderRef<PlaygroundRunnerEvent>;
          dialect: Dialect;
        };
      }) => {
        const { dialect, sender } = input;

        // intercept console.* calls
        function intercept(...args: unknown[]) {
          // Get the current module from the top of the stack
          const fileName = window.moduleStack.at(-1)?.slice(2) as
            | BaseFileName<UserPlaygroundFileName>
            | undefined;
          sender.send({
            type: "playgroundRunner.outputs.push",
            outputs: parseOutputs(fileName, ...args),
          });
        }

        try {
          const { files, imports } = await getPlaygroundFiles();
          const run = await createModuleSystem(
            files,
            await fetchNodeModules(imports, dialect),
          );

          const runArgs = {
            $: PlaygroundTools,
            console: {
              log: intercept,
              error: intercept,
              warn: intercept,
              info: intercept,
            },
          };

          if (files["seed.js"]) {
            await run("./seed", runArgs);
          }

          await run("./index", runArgs);
        } catch (cause) {
          intercept(cause);
        }
      },
    ),
  },
  actions: {
    setError: enqueueActions(({ enqueue, event }) => {
      enqueue.assign({
        error: makeInvokeFailure(event),
      });
    }),
    clearError: enqueueActions(({ enqueue }) => {
      enqueue.assign({
        error: null,
      });
    }),
    loadHistory: enqueueActions(({ context, enqueue, event }) => {
      assertEvent(event, "playgroundRunner.outputs.history.load");
      const index = event.index;
      const history = context.history[index];

      enqueue.assign({
        outputs: history,
      });
    }),
    updateHistory: enqueueActions(({ context, enqueue }) => {
      enqueue.assign({
        history:
          context.outputs.length > 0
            ? [context.outputs, ...context.history]
            : [],
      });
    }),
    clearOutputs: enqueueActions(({ enqueue }) => {
      enqueue.assign({
        outputs: [],
      });
    }),
    updateOutputs: enqueueActions(({ context, enqueue, event }) => {
      assertEvent(event, "playgroundRunner.outputs.push");
      enqueue.assign({
        outputs: context.outputs.concat(event.outputs),
      });
    }),
    setSetupError: enqueueActions(({ enqueue, event }) => {
      enqueue.assign({
        setupError: makeInvokeFailure(event),
      });
    }),
  },
  guards: {
    hasSetupError: ({ context }) => context.setupError !== null,
  },
}).createMachine({
  id: "playgroundRunner",
  context: ({ input }) => ({
    setupError: null,
    dialect: input.dialect,
    error: null,
    outputs: [],
    history: [],
  }),
  initial: "Setup",
  states: {
    Setup: {
      tags: "setup",
      initial: "Initializing monaco",
      states: {
        "Initializing monaco": {
          always: {
            guard: "hasSetupError",
            target: "Failed",
          },
          invoke: {
            src: "initMonaco",
            onDone: "#playgroundRunner.Started",
            onError: {
              actions: "setSetupError",
            },
          },
        },
        Failed: {
          tags: "start_failed",
          type: "final",
        },
      },
    },
    Started: {
      initial: "Idle",
      states: {
        Idle: {
          tags: "idle",
          on: {
            "playgroundRunner.outputs.history.load": {
              actions: "loadHistory",
            },
            "playgroundRunner.command.play": "Running playground",
          },
        },
        "Running playground": {
          tags: "running",
          entry: ["clearError", "clearOutputs"],
          on: {
            "playgroundRunner.outputs.push": {
              actions: "updateOutputs",
            },
          },
          initial: "Processing",
          states: {
            Processing: {
              invoke: {
                src: "play",
                input: ({ self, event, context }) => {
                  assertEvent(event, "playgroundRunner.command.play");
                  return {
                    sender: self,
                    dialect: context.dialect,
                  };
                },
                onDone: "Done",
                onError: {
                  target: "Done",
                  actions: "setError",
                },
              },
            },
            Done: {
              always: {
                actions: "updateHistory",
                target: "#playgroundRunner.Started.Idle",
              },
            },
          },
        },
      },
    },
  },
});

export async function extractSchema() {
  try {
    const { files } = await getPlaygroundFiles();
    const schemaFile = files["schema.js"];
    const run = await createModuleSystem(
      { "schema.js": schemaFile },
      await fetchNodeModules(schemaFile.imports),
    );
    const dialect = autoDetectDialect(schemaFile.imports);

    if (!dialect) {
      throw new Error(`Unsupported dialect ${dialect}`);
    }

    const config = {
      casing: "snake_case",
      projectId: "drizzle-run",
    } satisfies PartialConfig;

    switch (dialect) {
      case "postgresql": {
        const { schemaToSnapshot } = await import("@drizzle-lab/api/pg");

        return schemaToSnapshot(await run("./schema"), {
          ...config,
          dialect: "postgresql",
        });
      }
      case "sqlite": {
        const { schemaToSnapshot } = await import("@drizzle-lab/api/sqlite");
        return schemaToSnapshot(await run("./schema"), {
          ...config,
          dialect: "sqlite",
        });
      }
      default: {
        throw new Error(`Unsupported dialect ${dialect}`);
      }
    }
  } catch (cause) {
    console.warn("Unable to extract schema", cause);
  }
}

export async function schemaToSql() {
  try {
    const { files } = await getPlaygroundFiles();
    const schemaFile = files["schema.js"];
    const run = await createModuleSystem(
      { "schema.js": schemaFile },
      await fetchNodeModules(schemaFile.imports),
    );
    const dialect = autoDetectDialect(schemaFile.imports);

    if (!dialect) {
      throw new Error(`Unsupported dialect ${dialect}`);
    }

    const schema = await run("./schema");
    let sql = "";

    const config = {
      casing: "snake_case",
      projectId: "drizzle-run",
    } satisfies PartialConfig;

    switch (dialect) {
      case "postgresql": {
        const { schemaToSql } = await import("@drizzle-lab/api/pg");
        sql = schemaToSql(schema, config);
        break;
      }
      case "sqlite": {
        const { schemaToSql } = await import("@drizzle-lab/api/sqlite");

        sql = schemaToSql(schema, config);
        break;
      }
      case "mysql": {
        // sql = schemaToMySqlSql(schema).join("\n");
        break;
      }
    }

    return sql;
  } catch (cause) {
    console.warn("Unable to convert schema to SQL", cause);
    throw cause;
  }
}

export async function sqlToSchema(sqlDump: string, dialect: Dialect) {
  try {
    let schema = "";

    switch (dialect) {
      case "postgresql": {
        const { sqlToTypescript } = await import("@drizzle-lab/api/pg");
        schema = await sqlToTypescript(sqlDump);
        break;
      }
      case "sqlite": {
        const { sqlToTypescript } = await import("@drizzle-lab/api/sqlite");
        schema = await sqlToTypescript(sqlDump);
        break;
      }
    }

    return schema;
  } catch (cause) {
    console.warn("Unable to convert schema to SQL", cause);
    throw cause;
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Shortcuts;                                 */
/* -------------------------------------------------------------------------- */

const appShortcuts = ["d", "f", "1", "2", "3", "4"] as const;
type AppShortcut = (typeof appShortcuts)[number];

const shortcutWatcher = fromCallback(
  ({ sendBack }: { sendBack: (event: PlaygroundEvent) => void }) => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();

      if (!meta) {
        return;
      }

      if (appShortcuts.includes(key)) {
        e.preventDefault(); // Prevent the browser from capturing the shortcut
      }

      switch (key as AppShortcut) {
        case "d": {
          if (shift) {
            sendBack({ type: "run" });
          }

          break;
        }
        case "f": {
          if (alt) {
            sendBack({ type: "editor.file.format" });
          }
          break;
        }
        case "1": {
          sendBack({ type: "editor.file.open", fileName: "index.ts" });
          break;
        }
        case "2": {
          sendBack({ type: "editor.file.open", fileName: "schema.ts" });
          break;
        }
        case "3": {
          sendBack({ type: "editor.file.open", fileName: "utils.ts" });
          break;
        }
        case "4": {
          sendBack({ type: "editor.file.open", fileName: "seed.ts" });
          break;
        }
      }
    };

    document.addEventListener("keydown", handler);

    return () => {
      document.removeEventListener("keydown", handler);
    };
  },
);

/* -------------------------------------------------------------------------- */
/*                                 Playground;                                */
/* -------------------------------------------------------------------------- */

export type RemoteSyncState = "synced" | "out-of-sync";

type PlaygroundMachineInput = {
  playground: Playground;
  remoteSyncEnabled: boolean;
  remoteSyncState: RemoteSyncState;
  currentUserId: UserId | undefined;
};

export type PlaygroundMetadata = Omit<Playground, "content">;

type PlaygroundEvent =
  | { type: "run" }
  | { type: "fork" }
  | { type: "edit"; name: string }
  | { type: "delete" }
  | { type: "remoteSync.on" }
  | { type: "remoteSync.off" }
  | { type: "remoteSync.push" }
  | { type: "localSave.overwrite" }
  | { type: "localSave.save" }
  | { type: "localSave.discard"; serverPlayground: Playground }
  | EditorEvent
  | ExtractEvent<
      PlaygroundRunnerEvent,
      "playgroundRunner.outputs.history.load"
    >;

const serviceId = {
  editor: "editor",
  playgroundRunner: "playgroundRunner",
} as const;

const enableRemoteSync = fromPromise<
  NonNullable<Playground["creatorId"]>,
  Playground
>(async () => {
  throw actorNotProvided();
});
export type EnableRemoteSyncActor = typeof enableRemoteSync;

const disableRemoteSync = fromPromise<void>(async () => {
  throw actorNotProvided();
});
export type DisableRemoteSyncActor = typeof disableRemoteSync;

const pushRemoteChanges = fromPromise<void, Playground>(async () => {
  throw actorNotProvided();
});
export type PushRemoteChangesActor = typeof pushRemoteChanges;

const forkPlayground = fromPromise<
  void,
  { playground: Playground; userId: UserId }
>(async () => {
  throw actorNotProvided();
});
export type ForkPlaygroundActor = typeof forkPlayground;

const deletePlayground = fromPromise<
  void,
  { playgroundId: PlaygroundId; isRemotelySynced: boolean }
>(async () => {
  throw actorNotProvided();
});
export type DeletePlaygroundActor = typeof deletePlayground;

const PlaygroundMachine = setup({
  types: {
    input: {} as PlaygroundMachineInput,
    context: {} as {
      module: {
        editor: ActorRefFrom<EditorMachine>;
        playgroundRunner: ActorRefFrom<PlaygroundRunnerMachine>;
      };
      currentUserId: UserId;
      metadata: PlaygroundMetadata;
      remoteSync: {
        enabled: boolean;
        status: RemoteSyncState;
        error: InvokeFailure | null;
      };
      save: {
        error: InvokeFailure | null;
      };
      error: InvokeFailure | null;
    },
    tags: {} as
      | "editor:starting"
      | "editor:up"
      | "editor:crashed"
      | "remoteSync:processing"
      | "remoteSync:pushing"
      | "forking",
    events: {} as PlaygroundEvent,
  },
  actors: {
    playgroundRunner: PlaygroundRunnerMachine,
    editor: EditorMachine,
    shortcutWatcher,
    enableRemoteSync,
    disableRemoteSync,
    pushRemoteChanges,
    forkPlayground,
    deletePlayground,
    discardChanges: fromPromise(
      async ({ input }: { input: { playground: Playground } }) => {
        const { playground } = input;

        await localDb
          .update(localDb.schema.playground)
          .set(playground)
          .where(eq(localDb.schema.playground.id, playground.id));

        const { content, ...metadata } = playground;
        return { content, metadata };
      },
    ),
    savePlayground: fromPromise(
      async ({
        input,
      }: {
        input: { playground: Playground; overwrite?: boolean };
      }) => {
        const { playground, overwrite } = input;

        const [result] = await localDb
          .insert(localDb.schema.playground)
          .values(playground)
          .onConflictDoUpdate({
            target: localDb.schema.playground.id,
            set: {
              ...playground,
              updatedAt: overwrite ? playground.updatedAt : undefined,
            },
          })
          .returning();

        return result;
      },
    ),
  },
  actions: {
    setError: enqueueActions(({ enqueue, event }) => {
      enqueue.assign({
        error: makeInvokeFailure(event),
      });
    }),
    clearError: enqueueActions(({ enqueue }) => {
      enqueue.assign({
        error: null,
      });
    }),
    clearSaveError: enqueueActions(({ enqueue }) => {
      enqueue.assign({
        save: {
          error: null,
        },
      });
    }),
    setSaveError: enqueueActions(({ enqueue, event }) => {
      enqueue.assign({
        save: {
          error: makeInvokeFailure(event),
        },
      });
    }),
    setRemoteSyncError: enqueueActions(({ context, enqueue, event }) => {
      enqueue.assign({
        remoteSync: {
          ...context.remoteSync,
          error: makeInvokeFailure(event),
        },
      });
    }),
    clearRemoteSyncError: enqueueActions(({ context, enqueue }) => {
      enqueue.assign({
        remoteSync: {
          ...context.remoteSync,
          error: null,
        },
      });
    }),
    setPlaygroundCreatorId: enqueueActions(
      ({ context, enqueue }, params: Playground["creatorId"]) => {
        enqueue.assign({
          metadata: {
            ...context.metadata,
            // Since a playground can be created anonymously before being logged in, we need to update the creatorId
            creatorId: params,
          },
        });
      },
    ),
    setRemoteSynced: enqueueActions(({ context, enqueue }) => {
      enqueue.assign({
        remoteSync: {
          ...context.remoteSync,
          status: "synced",
        },
      });
    }),
    setRemoteOutOfSync: enqueueActions(({ context, enqueue }) => {
      enqueue.assign({
        remoteSync: {
          ...context.remoteSync,
          status: "out-of-sync",
        },
      });
    }),
    setRemoteSyncEnabled: enqueueActions(({ context, enqueue }) => {
      enqueue.assign({
        remoteSync: {
          ...context.remoteSync,
          enabled: true,
          status: "synced",
        },
      });
    }),
    setRemoteSyncDisabled: enqueueActions(({ context, enqueue }) => {
      enqueue.assign({
        remoteSync: {
          ...context.remoteSync,
          enabled: false,
          status: "out-of-sync",
        },
      });
    }),
    setMetadata: enqueueActions(
      ({ context, enqueue }, params: Partial<PlaygroundMetadata>) => {
        enqueue.assign({
          metadata: {
            ...context.metadata,
            ...params,
          },
        });
      },
    ),
    runPlayground: enqueueActions(({ enqueue, context }) => {
      enqueue.sendTo(context.module.playgroundRunner, {
        type: "playgroundRunner.command.play",
      });
    }),
    init: enqueueActions(({ context, enqueue }) => {
      if (
        context.remoteSync.enabled &&
        context.remoteSync.status === "synced"
      ) {
        enqueue.raise({ type: "localSave.overwrite" });
      }
    }),
    resetPlaygroundEditor: enqueueActions(
      (
        { enqueue, context },
        params: {
          content: Playground["content"];
          metadata: PlaygroundMetadata;
        },
      ) => {
        const { content, metadata } = params;
        enqueue.stopChild(serviceId.editor);
        enqueue.assign(({ spawn }) => ({
          metadata,
          remoteSync: {
            ...context.remoteSync,
            status: "synced",
          },
          module: {
            ...context.module,
            editor: spawn("editor", {
              id: serviceId.editor,
              input: {
                fileTree: content,
                dialect: metadata.dialect,
              },
            }),
          },
        }));
      },
    ),
  },
  guards: {
    isCurrentUserPlayground: ({ context }) =>
      context.metadata.creatorId === context.currentUserId ||
      context.metadata.creatorId === anonymousCreatorId,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcA2BDAnlATgewFcA7CAOgHUwAjAAgGM8iAXdASyLBwGJJWm8cpAGatUYUnQAW6IjADaABgC6iFHlh9WjVSAAeiAOwAmACykTJgKxGDATgAcANkcnbjowBoQmRPYCMfqQGfvaWBsYAzH6WJo5+AL7xXmhYuIQkFNT0jCzsnFwA7tQAwjlsHIIAVIoqSCDI6pradfoIBi6kRpYR9uH+fqYKEV4+bdGdjjF+btZhEQaJyRjY+MRklLQMzOX5KZg1Og0aTFpEOq3hCuZ+dkZR0RGOBsPeiHH2pP53EbauJvZGPyORb1ZZpNakACiED4Ah4MP4VQOdSOTTOLUMQ1I01s0UsCgGTiBI0QfgUWJuNwsAx6lkcERBe3BGQAMng6OhUDRYOgAG5gLiodmcgDKfPEeH5OAKOD4YGRamOp3Ohk8rwQJmepEsoXssXaRlxJgUwKSoNSq1Zwq5PP58NhghEYgk0lk8uUh0aJ2aoAuatGNginSGClsDh69JMRkZYMtZDZHJt4tIABVZVAYDhueKuLpYCwmOJ0EJCzgABT4hQASi4TLjpATnOz-NT6czzfdtUVaJVCCelk+RgUXRHuL8ERMJIQNjMBiG48s4fCdwWZrr6Xj1o7pDFvPYUC4EEY4nYvLwAGtxLawAAFWMbhX1L3KjEIAKWQJdckRE22CIRIxHHsKcjFMUhyXJKkdSHHoYwtDcGy3a8dz5fceBwfBBBSJghAEABbUhrzveC1kfVFvXRX1SWiT9Kx-Rw-wAoCpwnMxjXcIFnnJFwLDglYEMbJMWwAeSlGVNFkQ9j1IU8LyvcViP40iPRRZ8fT0aiP06Ojf3-QDgPVbpAiiO5eh-AwrAYvjmU3RNt1EzhxJOSTOEw0hsNwnACKI+9lK7J8lXU1p31o79dKYgzRhMeZPkXH8hxCdoFGeaz6wAMQEc9SAASQgMQuE888yLUyiNLfOdtQg8dbAMIl-gMKc-GND5kvsUMP3pGr6VShCMpwLLcvy3hEWEURxCkGR5BU7sKN7G4rkrAkflquJ6saiIwm1WrkpNJx-zpHqIT6rLjrQo8OBkogz0vYRMsUmzisC0qLjpT4NocXbgn-SLSUeQIwn8Xaok1R5DoyY7SFOlyMIEdyMBw-Dbv6+640entX1Asx7AcaxNQsgECQa9UBg6AZXGSrqTGmMGyAAJTAPC8ELblMCIOgcrygUcAZpmwBFVn2cYNHZtfbojAmOkbFsQE8dsECINICcelDR5DW6EwadIenGeZ2ABY5-LuZ1vn9bwIQhGFl8qIQborhVriozCHVHEaukWtqgJnAJJw3E17XeZZtmDa5nnC35oPkAIWBJEtoLEDDYyngCAYFBiH5J2JgEzEmZ53BsL9sb90OwED9nISIdAqFQM7pNkm6wArquwH9sOBdj57EE1MxLBiIDscBKIwkalbzD1R4w0XWwDrXXyMhbku9aD8vK+r6G3I8xGG5X5vi-Duh297LvtV7+x+-HaIidGRLbFIP8DDF5wHGMewi+N0vSAAEVYHkq5ri66-EDCH+Yh557wPq+I+PdYin2lufIexN3hbX8FTCmH4hivwDovdmX9gFoVcrDDeXlSBAO3qAtu00Aro2tpAk+Z9B6X1JM4Rw4Ftp-kAkBe+GDdb6xvFHSQf8TxXTku5Ph89iiuhgLAcB1sE6KyTgEIcadfjD3CNiMIXRcY2CGKuJYJE57F3frw6OeCYZYXhp5Aikdo5iIkXAaRZUwziznD+XEtVLKgUapMZh99Qy1RiG4UCq4zREDwBAOAhxZ4QE9E9XsABaUwU54kaxnno9YWQti5AqNEqhZVT7gQCMYIEoYnD4ksFOX42dgjBDcLEQEPdNbQgdNkkW1smpXCps1MkbUXAu2JuOZhZNT6TFpBozWgkOzNKtmVBJxNHiVXJEOVwdgPzRhSUpK0dlkKDTAJMuOb5HgfBgnU38TD-SIHmFcZ4M4p72H2t1NZNlEKbOTGmVgGZOATNUjEiBi5zCOFDE1OkdgQhlPVF+YMJlgjXKiAyB59ZxnIV3PuXZHcED9FihfEyChT5+BAviCFAwoUWT-OOMZSFkwOWlLKZyUAUW9nRaETFKccVTisAtXUvcalPFsJrY6dKMYZyvjcZh7hXABAJHEZwyTdHrLIBDbZ-LrbGEaoaNi7R-gAQCG4YwvLMqQ0ysir5OTWhRgGZLCpvxWoMP2WBVqu1Fwfh6C-OFvU9XHUgIqhxvyow1RcaED8oKr7vUVkYQG+Jbk7WdTKx589S6etaDMq+-wFoe2mC4IENwuEL31gqo1LSyrGAHM4H4thsUdXmGc8qqjap3Bqti+kvQs3v2Xr-WQ8bDAGG1D8Yc8xcSnysNa6YMVgin0giafGqzo31ljVgz+38V6GpmlMv0niNq3xNICAkIQfhNtnUY-hba83LtJHccW3a0GhkBHcYeAFSA5wAhtYFF9EiJCAA */
  id: "playground",
  context: ({ input, spawn }) => {
    const { remoteSyncEnabled, remoteSyncState, playground, currentUserId } =
      input;
    const { content, ...metadata } = playground;
    return {
      module: {
        editor: spawn("editor", {
          id: serviceId.editor,
          input: {
            fileTree: content,
            dialect: metadata.dialect,
          },
        }),
        playgroundRunner: spawn("playgroundRunner", {
          id: serviceId.playgroundRunner,
          input: {
            dialect: metadata.dialect,
          },
        }),
      },
      currentUserId: currentUserId || anonymousCreatorId,
      metadata,
      remoteSync: {
        enabled: remoteSyncEnabled,
        status: remoteSyncState,
        error: null,
      },
      save: {
        error: null,
      },
      error: null,
    };
  },
  invoke: {
    id: "shortcutWatcher",
    src: "shortcutWatcher",
  },
  entry: "init",
  type: "parallel",
  states: {
    "Playground runner": {
      on: {
        "playgroundRunner.*": {
          actions: forwardTo(serviceId.playgroundRunner),
        },
        run: {
          actions: "runPlayground",
        },
      },
    },
    Editor: {
      on: {
        "editor.file.open": {
          description: "Forward to editor actor",
          actions: forwardTo(serviceId.editor),
        },
        "editor.*": {
          guard: "isCurrentUserPlayground",
          description: "Forward to editor actor",
          actions: forwardTo(serviceId.editor),
        },
      },
    },
    Delete: {
      initial: "Idle",
      states: {
        Idle: {
          on: {
            delete: {
              guard: "isCurrentUserPlayground",
              target: "Deleting",
            },
          },
        },
        Deleting: {
          invoke: {
            id: "deletePlayground",
            src: "deletePlayground",
            input: ({ context }) => {
              return {
                playgroundId: context.metadata.id,
                isRemotelySynced: context.remoteSync.enabled,
              };
            },
            onDone: "Deleted",
            onError: {
              target: "Idle",
              actions: "setError",
            },
          },
        },
        Deleted: {
          type: "final",
        },
      },
    },
    Metadata: {
      on: {
        edit: {
          guard: "isCurrentUserPlayground",
          actions: [
            {
              type: "setMetadata",
              params: ({ event }) => ({
                name: event.name,
              }),
            },
            raise({ type: "localSave.save" }),
          ],
        },
      },
    },
    "Local save": {
      id: "localSave",
      on: {
        "localSave.overwrite": {
          guard: "isCurrentUserPlayground",
          target: ".Overwriting",
        },
        "localSave.save": {
          guard: "isCurrentUserPlayground",
          target: ".Saving",
        },
        "localSave.discard": {
          guard: "isCurrentUserPlayground",
          target: ".Discarding",
        },
        "editor.file.change": {
          guard: "isCurrentUserPlayground",
          target: ".Trigger save",
        },
      },
      initial: "Idle",
      states: {
        Idle: {},
        "Trigger save": {
          entry: "clearSaveError",
          after: {
            500: {
              target: "Saving",
            },
          },
        },
        Saving: {
          invoke: {
            id: "savePlayground",
            src: "savePlayground",
            input: ({ context }) => {
              return {
                playground: {
                  ...context.metadata,
                  content: context.module.editor.getSnapshot().context.fileTree,
                },
              };
            },
            onDone: {
              target: "Idle",
              actions: [
                {
                  type: "setMetadata",
                  params: ({ event }) => event.output,
                },
                "setRemoteOutOfSync",
              ],
            },
            onError: {
              target: "Idle",
              actions: "setSaveError",
            },
          },
        },
        Overwriting: {
          entry: "clearSaveError",
          invoke: {
            id: "savePlayground",
            src: "savePlayground",
            input: ({ context }) => {
              return {
                overwrite: true,
                playground: {
                  ...context.metadata,
                  content: context.module.editor.getSnapshot().context.fileTree,
                },
              };
            },
            onDone: "Idle",
            onError: {
              target: "Idle",
              actions: "setSaveError",
            },
          },
        },
        Discarding: {
          entry: "clearSaveError",
          invoke: {
            id: "discardChanges",
            src: "discardChanges",
            input: ({ event }) => {
              assertEvent(event, "localSave.discard");
              return {
                playground: event.serverPlayground,
              };
            },
            onDone: {
              target: "Idle",
              actions: {
                type: "resetPlaygroundEditor",
                params: ({ event }) => {
                  return event.output;
                },
              },
            },
            onError: {
              target: "Idle",
              actions: "setSaveError",
            },
          },
        },
      },
    },
    Fork: {
      initial: "Idle",
      states: {
        Idle: {
          on: {
            fork: "Forking",
            "editor.file.change": {
              guard: not("isCurrentUserPlayground"),
              target: "Forking",
            },
          },
        },
        Forking: {
          tags: "forking",
          entry: ["clearError"],
          invoke: {
            id: "forkPlayground",
            src: "forkPlayground",
            input: ({ context }) => {
              return {
                playground: {
                  ...context.metadata,
                  content: context.module.editor.getSnapshot().context.fileTree,
                },
                userId: context.currentUserId,
              };
            },
            onDone: "Forked",
            onError: {
              target: "Idle",
              actions: "setError",
            },
          },
        },
        Forked: {
          type: "final",
        },
      },
    },
    "Remote sync": {
      initial: "Idle",
      states: {
        Idle: {
          exit: ["clearRemoteSyncError"],
          on: {
            "remoteSync.on": "Enabling",
            "remoteSync.off": "Disabling",
            "remoteSync.push": "Pushing",
          },
        },
        Enabling: {
          tags: "remoteSync:processing",
          entry: ["setRemoteSyncEnabled"],
          invoke: {
            id: "enableRemoteSync",
            src: "enableRemoteSync",
            input: ({ context }) => {
              return {
                ...context.metadata,
                content: context.module.editor.getSnapshot().context.fileTree,
              };
            },
            onDone: {
              target: "Idle",
              actions: {
                type: "setPlaygroundCreatorId",
                params: ({ event }) => event.output,
              },
            },
            onError: {
              target: "Idle",
              actions: ["setRemoteSyncError", "setRemoteSyncDisabled"],
            },
          },
        },
        Disabling: {
          tags: "remoteSync:processing",
          entry: ["setRemoteSyncDisabled"],
          invoke: {
            id: "disableRemoteSync",
            src: "disableRemoteSync",
            onDone: "Idle",
            onError: {
              target: "Idle",
              actions: ["setRemoteSyncError", "setRemoteSyncEnabled"],
            },
          },
        },
        Pushing: {
          tags: "remoteSync:pushing",
          entry: ["setRemoteSynced"],
          invoke: {
            id: "pushRemoteChanges",
            src: "pushRemoteChanges",
            input: ({ context }) => {
              return {
                ...context.metadata,
                content: context.module.editor.getSnapshot().context.fileTree,
              };
            },
            onDone: "Idle",
            onError: {
              target: "Idle",
              actions: ["setRemoteSyncError", "setRemoteOutOfSync"],
            },
          },
        },
      },
    },
  },
});

const inspector = createSkyInspector({
  autoStart: false,
});

export { inspector, PlaygroundMachine };
