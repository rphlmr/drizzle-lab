import { render, toastError } from "../../../utils";
import { createDrizzleVisualizerPanel } from "../panel";
import { startVisualizer } from "../server";

export const OpenVisualizerCommand = "drizzle.visualizer:open";

export async function OpenVisualizer(...args: any[]) {
  const OutputKey = `[${OpenVisualizerCommand}]`;
  const configPath = args[0];
  const envFilePath = args[1];

  if (!configPath || typeof configPath !== "string") {
    toastError(`${OutputKey} Expected config path to be a string`);
    return;
  }

  try {
    const { port } = await startVisualizer(configPath, envFilePath);
    const panel = createDrizzleVisualizerPanel();

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
    toastError(
      `${OutputKey} Failed to start Drizzle Visualizer: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return;
  }
}
