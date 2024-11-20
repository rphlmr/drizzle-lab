import * as vscode from "vscode";

import { getExtensionContext } from "./context";
import { render } from "./utils";

/* Local state */
let $panel: vscode.WebviewPanel | undefined = undefined;

export function getDrizzleVisualizerPanel() {
  if ($panel) {
    return $panel;
  }

  const context = getExtensionContext();

  $panel = vscode.window.createWebviewPanel(
    "DrizzleVisualizer",
    "Drizzle Visualizer",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  $panel.iconPath = {
    light: vscode.Uri.joinPath(context.extensionUri, "media", "drizzle.png"),
    dark: vscode.Uri.joinPath(context.extensionUri, "media", "drizzle.png"),
  };

  $panel.webview.html = render(`
		<p style="display: flex; justify-content: center; align-items: center; height: 100%; margin: 0; font-size: 1.5rem; font-weight: bold;">
      Starting Drizzle Visualizer...
    </p>
  `);

  $panel.onDidDispose(() => {
    $panel = undefined;
  });

  return $panel;
}

export function closeDrizzleVisualizerPanel() {
  $panel?.dispose();
}
