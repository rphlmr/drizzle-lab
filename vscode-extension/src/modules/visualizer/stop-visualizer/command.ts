import * as vscode from "vscode";

import { closeDrizzleVisualizerPanel } from "../panel";
import { stopVisualizer } from "../server";

export const command = "drizzle.visualizer:stop";

export const StopVisualizerCommand = vscode.commands.registerCommand(
  command,
  () => {
    stopVisualizer();
    closeDrizzleVisualizerPanel();
  },
);
