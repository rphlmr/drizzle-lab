import * as vscode from "vscode";

import { SelectEnv, SelectEnvCommand } from "./modules/internal/select-env.command";
import { stopStudio } from "./modules/studio/server";
import { OpenVisualizerCodeLens } from "./modules/visualizer/open-visualizer/codelens";
import { OpenVisualizer, OpenVisualizerCommand } from "./modules/visualizer/open-visualizer/command";
import { stopVisualizer } from "./modules/visualizer/server";
import { StopVisualizer, StopVisualizerCommand } from "./modules/visualizer/stop-visualizer/command";
import { outputChannel } from "./utils";

export function activate(context: vscode.ExtensionContext) {
  checkNodeVersion();

  context.subscriptions.push(
    /* Internal */
    vscode.commands.registerCommand(SelectEnvCommand, SelectEnv),

    /* Studio */
    // vscode.commands.registerCommand(OpenStudioCommand, OpenStudio),
    // vscode.commands.registerCommand(StopStudioCommand, StopStudio),
    // vscode.languages.registerCodeLensProvider(
    //   { pattern: "**/*{drizzle,config}*.ts", language: "typescript" },
    //   new OpenStudioCodeLens()
    // ),

    /* Visualizer */
    vscode.commands.registerCommand(OpenVisualizerCommand, OpenVisualizer),
    vscode.commands.registerCommand(StopVisualizerCommand, StopVisualizer),
    vscode.languages.registerCodeLensProvider(
      { pattern: "**/*{drizzle,config}*.ts", language: "typescript" },
      new OpenVisualizerCodeLens()
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  stopVisualizer();
  stopStudio();
}

function checkNodeVersion() {
  const version = vscode.extensions.getExtension("rphlmr.vscode-drizzle-orm")?.packageJSON?.version;
  outputChannel.appendLine(`Drizzle Visualizer activated: ${version}`);
  outputChannel.appendLine(`Platform: ${process.platform}`);
  outputChannel.appendLine(`Node version: ${process.version}`);

  const [major, minor] = process.version.split("v")[1].split(".").map(Number);
  if (major <= 20 && minor < 12) {
    const msg = `Drizzle Visualizer requires Node.js 20.12.0 or higher. You have ${process.version}`;
    vscode.window.showErrorMessage(msg);
    outputChannel.appendLine(msg);
    throw new Error(msg);
  }
}
