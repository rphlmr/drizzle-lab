import { closeDrizzleVisualizerPanel } from "../panel";

export const StopVisualizerCommand = "drizzle.visualizer:stop";

export function StopVisualizer() {
  closeDrizzleVisualizerPanel();
}
