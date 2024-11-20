import path from "node:path";
import * as vscode from "vscode";

export const outputChannel =
  vscode.window.createOutputChannel("Drizzle Visualizer");

export function render(children: string) {
  return `
  <!DOCTYPE html>
  <html style="padding: 0; margin: 0; width: 100%; height: 100%;">
    <body style="padding: 0; margin: 0; width: 100%; height: 100%;">
      ${children}
    </body>
  </html>`;
}

export async function findNearestPackageJson(startPath: vscode.Uri) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(startPath);

  if (!workspaceFolder) {
    throw new Error("No workspace folder found. Unable to find package.json");
  }

  let currentDir = path.dirname(startPath.fsPath);
  const rootPath = workspaceFolder.uri.fsPath;

  while (currentDir.startsWith(rootPath)) {
    const packageJsonPath = path.join(currentDir, "package.json");
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(packageJsonPath));
      return packageJsonPath;
    } catch {
      currentDir = path.dirname(currentDir);
    }
  }

  throw new Error("No workspace folder found. Unable to find package.json");
}
