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

export const SelectEnvAndOpenStudioCommand =
  "drizzle.studio:select_env_and_open";

/* Local state */
let $lastSelectedEnv: string | undefined;

export async function SelectEnvAndOpenStudio(configPath: string) {
  // Find .env files in the workspace
  const envFiles = await vscode.workspace.findFiles(
    "**/.env*",
    "**/node_modules/**",
  );

  // Create quick pick items
  const items = envFiles.map((file) => ({
    label: vscode.workspace.asRelativePath(file),
    path: file.fsPath,
  }));

  // Add option to not use an env file
  items.unshift({ label: "None", path: "Don't use an env file" });

  // Move last selected item to top if it exists
  if ($lastSelectedEnv) {
    const lastSelectedIndex = items.findIndex(
      (item) => item.path === $lastSelectedEnv,
    );
    if (lastSelectedIndex > -1) {
      const [lastItem] = items.splice(lastSelectedIndex, 1);
      items.unshift(lastItem);
    }
  }

  // Show quick pick
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select an environment file",
  });

  if (selected) {
    // Save the selection to workspace configuration (except for "None")
    if (selected.label !== "None") {
      $lastSelectedEnv = selected.path;
    }

    // Call open studio command with the selected env file
    await vscode.commands.executeCommand(
      OpenStudioCommand,
      configPath,
      selected.label === "None" ? undefined : selected.path,
    );
  }
}
