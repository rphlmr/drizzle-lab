import path from "node:path";
import type { Config } from "drizzle-kit";
import * as vscode from "vscode";

import { findProjectWorkingDir } from "../../../context";
import { importModule } from "../../../import-module";
import { createLogger, toastError } from "../../../utils";
import { createDrizzleVisualizerPanel } from "../panel";

export const OpenVisualizerCommand = "drizzle.visualizer:open";
const OutputKey = "[Visualizer]";
const logger = createLogger("visualizer");

export async function OpenVisualizer(...args: any[]) {
  const drizzleConfigPath = args[0];
  const envFilePath = args[1];

  if (!drizzleConfigPath || typeof drizzleConfigPath !== "string") {
    toastError(`${OutputKey} Expected config path to be a string`);
    logger.error("Expected config path to be a string");
    return;
  }

  logger.info("Opening Drizzle Visualizer");
  logger.info(`Drizzle config path: ${drizzleConfigPath}`);
  logger.info(`Env file path: ${envFilePath || "not provided"}`);

  try {
    const { tsSchema, schemaPaths } = await loadDrizzleTsSchema(drizzleConfigPath, envFilePath);

    console.debug("tsSchema   ", tsSchema);
    console.debug("schemaPaths", schemaPaths);

    // vscode.workspace.findFiles("");
    // const { port } = await startVisualizer(configPath, envFilePath);
    const panel = createDrizzleVisualizerPanel();

    // panel.webview.html = render(`
    // 		<iframe
    // 			src="http://127.0.0.1:${port}"
    // 			width="100%"
    // 			height="100%"
    // 			frameborder="0"
    // 			style="border: none;"
    // 		/>`);

    panel.reveal();
  } catch (error) {
    const msg = `Failed to start Drizzle Visualizer: ${error instanceof Error ? error.message : String(error)}`;
    toastError(msg);
    logger.error(msg);
    return;
  }
}

async function loadDrizzleTsSchema(drizzleConfigPath: string, envFilePath?: string) {
  const pwd = await findProjectWorkingDir(drizzleConfigPath);

  logger.info("Loading drizzle config");

  const {
    default: { schema },
  } = await importModule<Config>({ path: drizzleConfigPath, envFilePath }, pwd);

  if (!schema) {
    throw new Error("Drizzle config does not have a schema");
  }

  const schemaPaths: Array<string> = [];

  if (typeof schema === "string") {
    schemaPaths.push(schema);
  } else {
    schemaPaths.push(...schema);
  }

  logger.info(`Drizzle config loaded. Schema paths: ${schemaPaths.join(", ")}`);

  const schemaFilePaths = (
    await Promise.all(
      schemaPaths.map(async (schemaPath) => {
        const pattern = path.relative(".", schemaPath);
        const baseUri = vscode.Uri.file(pwd);

        const filesUris = await vscode.workspace.findFiles({
          baseUri,
          pattern,
          base: baseUri.fsPath,
        });

        return filesUris.map((u) => u.fsPath);
      })
    )
  ).flat();

  if (schemaFilePaths.length === 0) {
    throw new Error("No schema files found");
  }

  logger.info(`Schema files paths: [${schemaFilePaths.join(", ")}]`);
  logger.info("Loading Drizzle typescript schema");

  const tsSchemas = await Promise.all(
    schemaFilePaths.map(async (path) => {
      return await importModule<Config>({ path, envFilePath }, pwd);
    })
  );

  const tsSchema = tsSchemas.reduce((acc, schema) => Object.assign(acc, schema), {} as Record<string, unknown>);

  logger.info("Drizzle typescript schema loaded");

  return {
    tsSchema,
    schemaPaths,
  };
}
