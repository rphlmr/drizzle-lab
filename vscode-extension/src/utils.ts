import path from "node:path";
import * as vscode from "vscode";

export const outputChannel = vscode.window.createOutputChannel("Drizzle Visualizer", { log: true });

export function createLogger(key: string) {
  return {
    info: (message: string) => outputChannel.info(`[${key}] ${message}`),
    warn: (message: string) => outputChannel.warn(`[${key}] ${message}`),
    error: (message: string) => outputChannel.error(`[${key}] ${message}`),
  };
}

export function toastError(message: string) {
  vscode.window.showErrorMessage(message);
}

export function createPanel({
  id,
  title,
  onDispose = () => {},
}: {
  id: string;
  title: string;
  onDispose?: () => void;
}) {
  const panel = vscode.window.createWebviewPanel(id, title, vscode.ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });

  panel.iconPath = {
    light: vscode.Uri.joinPath(vscode.Uri.file(path.dirname(__dirname)), "media", "drizzle.png"),
    dark: vscode.Uri.joinPath(vscode.Uri.file(path.dirname(__dirname)), "media", "drizzle.png"),
  };

  panel.onDidDispose(onDispose);

  return panel;
}

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

export function findDrizzleConfigLines(text: string, options: { requireDb: boolean } = { requireDb: false }) {
  const isConfig =
    text.includes("drizzle-kit") &&
    (text.includes("defineConfig") || text.includes("type Config") || text.includes("satisfies Config")) &&
    (options.requireDb ? text.includes("dbCredentials") : true);

  if (!isConfig) {
    return [];
  }

  return text
    .split("\n")
    .map((line, index) => ({ line, index }))
    .filter(
      ({ line }) =>
        (line.includes("defineConfig") || line.includes("default")) &&
        (line.includes("export") || line.includes("module.exports"))
    );
}
