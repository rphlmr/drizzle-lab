import { closeDrizzleVisualizerPanel } from "../panel";
import { stopVisualizer } from "../server";

export const StopVisualizerCommand = "drizzle.visualizer:stop";

export function StopVisualizer() {
  stopVisualizer();
  closeDrizzleVisualizerPanel();
}
