import * as vscode from "vscode";

import { getConfiguration } from "../../../context";
import { outputChannel, render, toastError } from "../../../utils";
import { createDrizzleStudioPanel } from "../panel";
import { startStudio } from "../server";

export const OpenStudioCommand = "drizzle.studio:open";

export async function OpenStudio(...args: any[]) {
  const OutputKey = `[${OpenStudioCommand}]`;
  const configPath = args[0];
  const envFile = args[1];

  if (!configPath || typeof configPath !== "string") {
    toastError(`${OutputKey} Expected config path to be a string`);
    return;
  }

  try {
    await startStudio(configPath, envFile);
    const panel = createDrizzleStudioPanel();

    const studioUrl =
      getConfiguration<string>("studio.url") || "https://local.drizzle.studio";

    outputChannel.appendLine(`${OutputKey} using Studio URL: ${studioUrl}`);

    panel.webview.html = render(`
				<iframe
          src="${studioUrl}" 
					width="100%" 
					height="100%" 
					frameborder="0"
					style="border: none;"
          sandbox="allow-scripts allow-same-origin allow-downloads"
				/>`);

    panel.reveal();
  } catch (error) {
    toastError(
      `${OutputKey} Failed to start Drizzle Studio: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return;
  }
}
