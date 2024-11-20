import * as vscode from "vscode";

import visualizerPkg from "../visualizer/package.json";
import { setExtensionContext } from "./context";
import { OpenVisualizerCodeLens } from "./modules/open-visualizer/codelens";
import { OpenVisualizerCommand } from "./modules/open-visualizer/command";
import { StopVisualizerCommand } from "./modules/stop-visualizer/command";
import { stop } from "./server";
import { outputChannel } from "./utils";

export function activate(context: vscode.ExtensionContext) {
  setExtensionContext(context);
  checkNodeVersion();

  // Register CodeLens and commands
  context.subscriptions.push(
    OpenVisualizerCodeLens,
    OpenVisualizerCommand,
    StopVisualizerCommand,
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  stop();
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
