import type { WebviewPanel } from "vscode";

import { createPanel, render } from "../../utils";

/* Local state */
let $panel: WebviewPanel | undefined;

export function createDrizzleStudioPanel() {
  if ($panel) {
    return $panel;
  }

  $panel = createPanel({
    id: "DrizzleStudio",
    title: "Drizzle Studio",
    onDispose: () => {
      $panel = undefined;
    },
  });

  $panel.webview.html = render(`
		<p style="display: flex; justify-content: center; align-items: center; height: 100%; margin: 0; font-size: 1.5rem; font-weight: bold;">
      Starting Drizzle Studio...
    </p>
  `);

  return $panel;
}

export function closeDrizzleStudioPanel() {
  $panel?.dispose();
}
