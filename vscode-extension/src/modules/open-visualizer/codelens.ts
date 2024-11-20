import * as vscode from "vscode";

import { command } from "./command";

class CodeLens implements vscode.CodeLensProvider {
  async provideCodeLenses(
    document: vscode.TextDocument,
  ): Promise<vscode.CodeLens[]> {
    const text = document.getText();

    // Check if file contains drizzle-kit related content
    const isDrizzleConfig =
      text.includes("drizzle-kit") &&
      (text.includes("defineConfig") ||
        text.includes("type Config") ||
        text.includes("satisfies Config"));

    if (!isDrizzleConfig) {
      return [];
    }

    // Find export statements that include defineConfig or default
    const configLines = text
      .split("\n")
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
        command,
        tooltip: "Open Drizzle Schema Visualizer",
        arguments: [document.uri.fsPath],
      });
    });
  }
}

export const OpenVisualizerCodeLens = vscode.languages.registerCodeLensProvider(
  { pattern: "**/*{drizzle,config}.ts" },
  new CodeLens(),
);
