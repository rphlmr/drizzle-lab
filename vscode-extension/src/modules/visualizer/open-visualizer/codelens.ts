import * as vscode from "vscode";

import { findDrizzleConfigLines } from "../../../utils";
import { OpenVisualizerCommand } from "./command";
import { SelectEnvCommand } from "../../internal/select-env.command";

export class OpenVisualizerCodeLens implements vscode.CodeLensProvider {
  async provideCodeLenses(
    document: vscode.TextDocument,
  ): Promise<vscode.CodeLens[]> {
    return findDrizzleConfigLines(document.getText()).map(({ index }) => {
      const range = new vscode.Range(
        new vscode.Position(index, 0),
        new vscode.Position(index, 0),
      );

      return new vscode.CodeLens(range, {
        title: "🌧️ Open Drizzle Visualizer",
        command: SelectEnvCommand,
        tooltip: "Open Drizzle Schema Visualizer",
        arguments: [document.uri.fsPath, OpenVisualizerCommand],
      });
    });
  }
}
