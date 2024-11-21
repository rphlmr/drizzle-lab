import path from "node:path";
import * as vscode from "vscode";

import pkg from "../package.json";
import { toastError } from "./utils";

/* Constants */
const OutputKey = "[Context]";

type Configuration = typeof pkg.contributes.configuration.properties;
type ConfigurationKey = keyof Configuration extends `${string}.${infer Rest}`
  ? Rest
  : never;

export function getConfiguration<Type>(key: ConfigurationKey) {
  return vscode.workspace.getConfiguration("drizzle").get<Type>(key);
}

export function getWorkspaceRootFolder(startPath: string) {
  const workspaceRootPath = vscode.workspace.getWorkspaceFolder(
    vscode.Uri.file(startPath),
  )?.uri.fsPath;

  if (!workspaceRootPath) {
    const msg = `${OutputKey} No workspace root folder found`;
    toastError(msg);
    throw new Error(msg);
  }

  return workspaceRootPath;
}

export async function findProjectWorkingDir(configPath: string) {
  const pwd = path.dirname(await findNearestPackageJson(configPath));

  if (!pwd) {
    const msg = `${OutputKey} No workspace folder`;
    toastError(msg);
    throw new Error(msg);
  }

  return pwd;
}

async function findNearestPackageJson(startPath: string) {
  const rootPath = getWorkspaceRootFolder(startPath);
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

  const msg = `${OutputKey} No package.json found in workspace`;
  toastError(msg);
  throw new Error(msg);
}
