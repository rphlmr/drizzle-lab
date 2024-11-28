import * as vscode from "vscode";

import visualizerPkg from "../apps/visualizer/package.json";
import { OpenVisualizerCodeLens } from "./modules/visualizer/open-visualizer/codelens";
import {
  OpenVisualizer,
  OpenVisualizerCommand,
} from "./modules/visualizer/open-visualizer/command";
import {
  StopVisualizerCommand,
  StopVisualizer,
} from "./modules/visualizer/stop-visualizer/command";
import { stopVisualizer } from "./modules/visualizer/server";
import { outputChannel } from "./utils";
import {
  OpenStudioCommand,
  OpenStudio,
} from "./modules/studio/open-studio/command";
import {
  StopStudioCommand,
  StopStudio,
} from "./modules/studio/stop-studio/command";
import { OpenStudioCodeLens } from "./modules/studio/open-studio/codelens";
import { stopStudio } from "./modules/studio/server";
import {
  SelectEnv,
  SelectEnvCommand,
} from "./modules/internal/select-env.command";

export function activate(context: vscode.ExtensionContext) {
  checkNodeVersion();

  context.subscriptions.push(
    /* Internal */
    vscode.commands.registerCommand(SelectEnvCommand, SelectEnv),

    /* Studio */
    vscode.commands.registerCommand(OpenStudioCommand, OpenStudio),
    vscode.commands.registerCommand(StopStudioCommand, StopStudio),
    vscode.languages.registerCodeLensProvider(
      { pattern: "**/*{drizzle,config}.ts", language: "typescript" },
      new OpenStudioCodeLens(),
    ),

    /* Visualizer */
    vscode.commands.registerCommand(OpenVisualizerCommand, OpenVisualizer),
    vscode.commands.registerCommand(StopVisualizerCommand, StopVisualizer),
    vscode.languages.registerCodeLensProvider(
      { pattern: "**/*{drizzle,config}.ts", language: "typescript" },
      new OpenVisualizerCodeLens(),
    ),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  stopVisualizer();
  stopStudio();
}

function checkNodeVersion() {
  const version = vscode.extensions.getExtension("rphlmr.vscode-drizzle-orm")
    ?.packageJSON?.version;
  outputChannel.appendLine(`Drizzle Visualizer activated: ${version}`);
  outputChannel.appendLine(`Visualizer version: ${visualizerPkg.version}`);
  outputChannel.appendLine(`Platform: ${process.platform}`);
  outputChannel.appendLine(`Node version: ${process.version}`);

  if (Number(process.version.split("v")[1].split(".")[0]) < 20) {
    const msg = `Drizzle Visualizer requires Node.js 20 or higher. You have ${process.version}`;
    vscode.window.showErrorMessage(msg);
    outputChannel.appendLine(msg);
    throw new Error(msg);
  }
}
