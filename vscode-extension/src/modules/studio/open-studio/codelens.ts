import * as vscode from "vscode";

import { findDrizzleConfigLines } from "../../../utils";
import { SelectEnvCommand } from "../../internal/select-env.command";
import { findDrizzleKitPath } from "../server";
import { OpenStudioCommand } from "./command";

export class OpenStudioCodeLens implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const drizzleKitPath = findDrizzleKitPath(document.uri.fsPath);

    if (!drizzleKitPath) {
      return [];
    }

    return findDrizzleConfigLines(document.getText(), { requireDb: true }).map(({ index }) => {
      const range = new vscode.Range(new vscode.Position(index, 0), new vscode.Position(index, 0));

      return new vscode.CodeLens(range, {
        title: "🌧️ Open Drizzle Studio",
        command: SelectEnvCommand,
        tooltip: "Open Drizzle Studio",
        arguments: [document.uri.fsPath, OpenStudioCommand],
      });
    });
  }
}
