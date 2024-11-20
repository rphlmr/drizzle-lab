import * as vscode from "vscode";
import { outputChannel } from "./utils";
import path from "node:path";

/* Local state */
let $context: vscode.ExtensionContext | undefined = undefined;

/* Constants */
const OutputKey = "[Context]";

export function setExtensionContext(context: vscode.ExtensionContext) {
  $context = context;
}

export function getExtensionContext() {
  if (!$context) {
    const msg = `${OutputKey} Context not set`;
    outputChannel.appendLine(msg);
    throw new Error(msg);
  }

  return $context;
}

export async function getProjectWorkingDir(configPath: string) {
  const pwd = path.dirname(await findNearestPackageJson(configPath));

  if (!pwd) {
    const msg = `${OutputKey} No workspace folder`;
    vscode.window.showErrorMessage(msg);
    outputChannel.appendLine(msg);
    throw new Error(msg);
  }

  return pwd;
}

async function findNearestPackageJson(startPath: string) {
  const rootPath = vscode.workspace.getWorkspaceFolder(
    vscode.Uri.file(startPath),
  )?.uri.fsPath;

  const msg = `${OutputKey} No root folder found. Unable to find package.json`;

  if (!rootPath) {
    vscode.window.showErrorMessage(msg);
    outputChannel.appendLine(msg);
    throw new Error(msg);
  }

  let currentDir = path.dirname(startPath);

  while (currentDir.startsWith(rootPath)) {
    try {
      const packageJsonPath = path.join(currentDir, "package.json");
      await vscode.workspace.fs.stat(vscode.Uri.file(packageJsonPath));
      return packageJsonPath;
    } catch {
      currentDir = path.dirname(currentDir);
    }
  }

  vscode.window.showErrorMessage(msg);
  outputChannel.appendLine(msg);
  throw new Error(msg);
}
