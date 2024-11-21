import type { WebviewPanel } from "vscode";

import { createPanel, render } from "../../utils";

/* Local state */
let $panel: WebviewPanel | undefined = undefined;

export function createDrizzleVisualizerPanel() {
  if ($panel) {
    return $panel;
  }

  $panel = createPanel({
    id: "DrizzleVisualizer",
    title: "Drizzle Visualizer",
    onDispose: () => {
      $panel = undefined;
    },
  });

  $panel.webview.html = render(`
		<p style="display: flex; justify-content: center; align-items: center; height: 100%; margin: 0; font-size: 1.5rem; font-weight: bold;">
      Starting Drizzle Visualizer...
    </p>
  `);

  return $panel;
}

export function closeDrizzleVisualizerPanel() {
  $panel?.dispose();
}
