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
    const pwd = await findProjectWorkingDir(drizzleConfigPath);

    logger.info("Loading drizzle config");

    const configModule = await importModule<Config>({ path: drizzleConfigPath, envFilePath }, pwd);

    logger.info(`Drizzle config loaded. Schema path: ${configModule.default.schema}`);

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
