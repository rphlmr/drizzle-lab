import * as vscode from "vscode";

import { findDrizzleConfigLines } from "../../../utils";
import { findDrizzleKitPath } from "../server";
import { SelectEnvAndOpenStudioCommand } from "./command";

export class OpenStudioCodeLens implements vscode.CodeLensProvider {
  async provideCodeLenses(
    document: vscode.TextDocument,
  ): Promise<vscode.CodeLens[]> {
    const drizzleKitPath = findDrizzleKitPath(document.uri.fsPath);

    if (!drizzleKitPath) {
      return [];
    }

    return findDrizzleConfigLines(document.getText(), { requireDb: true }).map(
      ({ index }) => {
        const range = new vscode.Range(
          new vscode.Position(index, 0),
          new vscode.Position(index, 0),
        );

        return new vscode.CodeLens(range, {
          title: "🌧️ Open Drizzle Studio",
          command: SelectEnvAndOpenStudioCommand,
          tooltip: "Open Drizzle Studio",
          arguments: [document.uri.fsPath],
        });
      },
    );
  }
}
