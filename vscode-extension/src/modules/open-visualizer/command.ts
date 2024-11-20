import * as vscode from "vscode";

import { getDrizzleVisualizerPanel } from "../../panel";
import { start } from "../../server";
import { outputChannel, render } from "../../utils";

export const command = "drizzle.visualizer:open";

const OutputKey = `[${command}]`;

export const OpenVisualizerCommand = vscode.commands.registerCommand(
  command,
  async (...args) => {
    const configPath = args[0];

    if (!configPath || typeof configPath !== "string") {
      const msg = `${OutputKey} Expected config path to be a string`;

      vscode.window.showErrorMessage(msg);
      outputChannel.appendLine(msg);

      return;
    }

    try {
      const panel = getDrizzleVisualizerPanel();
      const { port } = await start(configPath);

      panel.webview.html = render(`
				<iframe 
					src="http://127.0.0.1:${port}" 
					width="100%" 
					height="100%" 
					frameborder="0"
					style="border: none;"
				/>`);

      panel.reveal();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const msg = `${OutputKey} Failed to start Drizzle Visualizer: ${errorMessage}`;

      vscode.window.showErrorMessage(msg);
      outputChannel.appendLine(msg);

      return;
    }
  },
);
