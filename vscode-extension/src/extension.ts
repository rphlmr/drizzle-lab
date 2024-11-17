import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path from "node:path";
import * as vscode from "vscode";

import visualizerPkg from "../visualizer/package.json";

const outputChannel = vscode.window.createOutputChannel("Drizzle Visualizer");
let currentPanel: vscode.WebviewPanel | undefined = undefined;
let visualizerServer: ChildProcessWithoutNullStreams | undefined = undefined;
let currentConfigPath: string | undefined = undefined;
let processIds: number[] = [];
let port: string | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {
  const version = vscode.extensions.getExtension("rphlmr.vscode-drizzle-orm")
    ?.packageJSON?.version;
  outputChannel.appendLine(`Drizzle Visualizer activated: ${version}`);
  outputChannel.appendLine(`Visualizer version: ${visualizerPkg.version}`);
  outputChannel.appendLine(`Platform: ${process.platform}`);
  outputChannel.appendLine(`Node version: ${process.version}`);

  if (Number(process.version.split("v")[1].split(".")[0]) < 20) {
    vscode.window.showErrorMessage(
      "Drizzle Visualizer requires Node.js 20 or higher",
    );
    outputChannel.appendLine(
      `Drizzle Visualizer requires Node.js 20 or higher, you have ${process.version}`,
    );
    return;
  }

  // Add CodeLens provider
  const codeLensProvider = new (class implements vscode.CodeLensProvider {
    async provideCodeLenses(
      document: vscode.TextDocument,
    ): Promise<vscode.CodeLens[]> {
      const text = document.getText();

      // Check if file contains drizzle-related content
      const isDrizzleFile =
        text.includes("drizzle-kit") &&
        (text.includes("defineConfig") ||
          text.includes("type Config") ||
          text.includes("satisfies Config"));

      if (!isDrizzleFile) {
        return [];
      }

      // Find export statements that include defineConfig
      const lines = text.split("\n");
      const configLines = lines
        .map((line, index) => ({ line, index }))
        .filter(
          ({ line }) =>
            (line.includes("defineConfig") || line.includes("default")) &&
            (line.includes("export") || line.includes("module.exports")),
        );

      return configLines.map(({ index }) => {
        const range = new vscode.Range(
          new vscode.Position(index, 0),
          new vscode.Position(index, 0),
        );

        return new vscode.CodeLens(range, {
          title: "🌧️ Open Drizzle Visualizer",
          command: "drizzle.visualizer:start",
          tooltip: "Open Drizzle Schema Visualizer",
          arguments: [true],
        });
      });
    }
  })();

  // Register the CodeLens provider
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { pattern: "**/*{drizzle,config}.ts" },
      codeLensProvider,
    ),
  );

  const visualizerStart = vscode.commands.registerCommand(
    "drizzle.visualizer:start",
    async (isConfigFile: boolean) => {
      const activeEditorUri = vscode.window.activeTextEditor?.document.uri;

      if (!activeEditorUri) {
        vscode.window.showErrorMessage("No active editor");
        outputChannel.appendLine("[Server] No active editor");
        return;
      }

      const cwd = path.dirname(await findNearestPackageJson(activeEditorUri));

      if (!cwd) {
        vscode.window.showErrorMessage("No workspace folder");
        outputChannel.appendLine("[Server] No workspace folder");
        return;
      }

      outputChannel.appendLine(`[Server] Workspace folder: ${cwd}`);

      if (isConfigFile) {
        outputChannel.appendLine(
          `[Server] Loading config from: ${activeEditorUri.fsPath}`,
        );
      }

      // If the config file has changed, restart the server
      if (
        isConfigFile &&
        currentConfigPath &&
        currentConfigPath !== activeEditorUri.fsPath
      ) {
        outputChannel.appendLine(
          `[Server] Config file changed. Killing server on port ${port} and restarting`,
        );
        killServer();
      }

      currentConfigPath = activeEditorUri.fsPath;

      // If we already have a panel, show it instead of creating a new one
      if (currentPanel) {
        currentPanel.reveal();
      }

      // Create and show webview panel
      currentPanel =
        currentPanel ||
        vscode.window.createWebviewPanel(
          "DrizzleVisualizer",
          "Drizzle Visualizer",
          vscode.ViewColumn.One,
          {
            enableScripts: true,
          },
        );

      currentPanel.iconPath = {
        light: vscode.Uri.joinPath(
          context.extensionUri,
          "media",
          "drizzle_dark.png",
        ),
        dark: vscode.Uri.joinPath(context.extensionUri, "media", "drizzle.png"),
      };

      if (!port) {
        // random port from 60_000 to 64_000
        port = String(Math.floor(Math.random() * 4000) + 60000);
      }

      const iframe = HTML(`
      <iframe 
        src="http://127.0.0.1:${port}" 
        width="100%" 
        height="100%" 
        frameborder="0"
        style="border: none;"
      />`);

      if (visualizerServer) {
        outputChannel.appendLine(
          `[Server] Already running, reusing port ${port}`,
        );
        currentPanel.webview.html = iframe;
      } else {
        outputChannel.appendLine(
          `[Server] Drizzle Visualizer is starting on port ${port}`,
        );
        currentPanel.webview.html = HTML(`
        <p style="display: flex; justify-content: center; align-items: center; height: 100%; margin: 0; font-size: 1.5rem; font-weight: bold;">
          Starting Drizzle Visualizer...
        </p>`);
      }

      const extensionCwd = path.dirname(__dirname);

      outputChannel.appendLine(`[Server] extension cwd: ${extensionCwd}`);

      const binPath = path.join(
        extensionCwd,
        "visualizer",
        "server",
        "index.mjs",
      );

      outputChannel.appendLine(
        `[Server] Using drizzle visualizer from: ${binPath}`,
      );

      const configPath = path.relative(cwd, activeEditorUri.fsPath);

      if (!configPath) {
        outputChannel.appendLine("[Server] No config path found. Stopping");
        throw new Error("No config path found");
      }

      const drizzleEnvs = {
        DRIZZLE_LAB_CONFIG_PATH: configPath,
        DRIZZLE_LAB_SAVE_DIR: ".drizzle",
        DRIZZLE_LAB_PROJECT_ID: "visualizer",
        DRIZZLE_LAB_CWD: cwd,
        DRIZZLE_LAB_DEBUG: "true",
        PORT: port,
        NODE_ENV: "production",
        DRIZZLE_LAB_TS_CONFIG_PATH: path.join(cwd, "tsconfig.json"),
      };

      outputChannel.appendLine(
        `[Server] Loading drizzle envs: ${JSON.stringify(drizzleEnvs, null, 2)}`,
      );

      // Start the server
      visualizerServer =
        visualizerServer ||
        spawn(process.execPath, [binPath], {
          stdio: "pipe",
          detached: true,
          shell: false,
          cwd: extensionCwd,
          env: {
            ...process.env,
            ...drizzleEnvs,
          },
        });

      processIds.push(visualizerServer.pid!);

      console.log("processIds registered", processIds);

      visualizerServer.stdout.on("close", (...args) => {
        outputChannel.appendLine(`[stdout close] ${args}`);
      });

      visualizerServer.stdout.on("data", (data) => {
        const output = data.toString().trim();
        outputChannel.appendLine(`[stdout] ${output}`);

        if (
          currentPanel &&
          output &&
          output.includes("Drizzle Visualizer is up and running")
        ) {
          currentPanel.webview.html = iframe;
        }
      });

      visualizerServer.on("error", (error) => {
        outputChannel.appendLine(`[process error] ${error.message}`);
        if (currentPanel) {
          currentPanel.webview.html = HTML(`
            <p style="display: flex; justify-content: center; align-items: center; height: 100%; margin: 0; font-size: 1.5rem; font-weight: bold;">
            ${error.message}
            </p>`);
        }
      });

      visualizerServer.stderr.on("data", (data) => {
        const output = data.toString().trim();
        outputChannel.appendLine(`[stderr] ${output}`);
      });

      visualizerServer.on("exit", (code, signal) => {
        outputChannel.appendLine(
          `[process exit] code: ${code}, signal: ${signal}`,
        );
      });

      // Clean up when the panel is closed
      currentPanel.onDidDispose(() => {
        currentPanel = undefined;
      });
    },
  );

  const stopVisualizer = vscode.commands.registerCommand(
    "drizzle.visualizer:stop",
    () => killServer(true),
  );

  context.subscriptions.push(visualizerStart, stopVisualizer);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function HTML(children: string) {
  return `
  <!DOCTYPE html>
  <html style="padding: 0; margin: 0; width: 100%; height: 100%;">
    <body style="padding: 0; margin: 0; width: 100%; height: 100%;">
      ${children}
    </body>
  </html>`;
}

function killServer(closePanel?: boolean) {
  outputChannel.appendLine("[Server] Stopping Drizzle Visualizer server...");

  console.log("processIds killable", processIds);

  processIds.forEach((pid) => {
    try {
      // On Windows, we need to kill the entire process tree
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", pid.toString(), "/F", "/T"]);
      } else {
        console.log("Killing process", pid);
        // On Unix-like systems, negative pid kills the process group
        process.kill(-pid, "SIGINT");
      }
    } catch (error) {
      outputChannel.appendLine(`[Server] Failed to kill server: ${error}`);
    }
  });

  visualizerServer = undefined;

  if (closePanel) {
    currentPanel?.dispose();
    currentPanel = undefined;
  }

  processIds = [];

  outputChannel.appendLine("[Server] Drizzle Visualizer stopped");
}

const findNearestPackageJson = async (startPath: vscode.Uri) => {
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
};
