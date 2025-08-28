import path from "node:path";
import { getSnapshot } from "@drizzle-lab/visualizer";
import type { Config } from "drizzle-kit";
import * as vscode from "vscode";
import { findProjectWorkingDir } from "../../../context";
import { importModule } from "../../../import-module";
import { createLogger, toastError } from "../../../utils";
import { createDrizzleVisualizerPanel } from "../panel";

export const OpenVisualizerCommand = "drizzle.visualizer:open";
const OutputKey = "[Visualizer]";
const extensionCwd = path.dirname(__dirname);
const extensionUri = vscode.Uri.file(extensionCwd);
console.log("extensionCwd", extensionCwd);
console.log("extensionUri", extensionUri);
console.log("extension __dirname", __dirname);
const logger = createLogger("visualizer");
const fileWatchers: Array<{
	filePath: string;
	watcher: vscode.FileSystemWatcher;
}> = [];

export async function OpenVisualizer(...args: any[]) {
	for (const w of fileWatchers) {
		w.watcher.dispose();
		logger.info(`Disposed file watcher: ${w.filePath}`);
	}

	fileWatchers.length = 0;

	const drizzleConfigPath = args[0];
	const envFilePath = args[1];

	if (!drizzleConfigPath || typeof drizzleConfigPath !== "string") {
		toastError(`${OutputKey} Expected config path to be a string`);
		logger.error("Expected config path to be a string");
		return;
	}

	logger.info("Opening Drizzle Visualizer");
	logger.info(`Drizzle config path: ${drizzleConfigPath}`);
	logger.info(`Env file path: ${envFilePath || "not provided"}`);

	try {
		const { tsSchema, dialect, schemaFilePaths } = await loadDrizzleTsSchema(
			drizzleConfigPath,
			envFilePath,
		);

		console.debug("tsSchema   ", tsSchema);
		console.debug("schemaFilePaths", schemaFilePaths);

		const panel = createDrizzleVisualizerPanel();

		fileWatchers.push(
			...schemaFilePaths.map((filePath) => {
				const watcher = vscode.workspace.createFileSystemWatcher(filePath);

				watcher.onDidChange(async () => {
					const { tsSchema, dialect } = await loadDrizzleTsSchema(
						drizzleConfigPath,
						envFilePath,
					);

					// @ts-expect-error unhandled for now
					const snapshot = getSnapshot(tsSchema, dialect);

					panel.webview.postMessage({
						type: "reload",
						snapshot,
					});
				});

				logger.info(`Watching for changes to the schema file: ${filePath}`);

				return { filePath, watcher };
			}),
		);

		console.debug("fileWatchers", fileWatchers);

		const viewPath = path.join("dist", "views");
		const scriptUri = panel.webview.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, viewPath, "index.js"),
		);
		const cssUri = panel.webview.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, viewPath, "index.css"),
		);

		console.info("scriptUri", scriptUri);

		// @ts-expect-error unhandled for now
		const snapshot = getSnapshot(tsSchema, dialect);
		console.info("snapshot", snapshot);

		panel.webview.html = `
			<!DOCTYPE html>
			<html lang="en" style="width: 100%; height: 100%; margin: 0; padding: 0;">
			<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<link rel="stylesheet" href="${cssUri}">
					<title>Drizzle Visualizer</title>
			</head>
			<body style="width: 100%; height: 100%; margin: 0; padding: 0;">
					<div id="root" style="width: 100%; height: 100%; margin: 0; padding: 0;"></div>
					<script>
							window.vscode = acquireVsCodeApi();
							window.initialData = ${JSON.stringify({ snapshot })};
					</script>
					<script src="${scriptUri}"></script>
			</body>
			</html>
		`;

		// panel.webview.html = render(`
		// 		<iframe
		// 			src="http://127.0.0.1:${port}"
		// 			width="100%"
		// 			height="100%"
		// 			frameborder="0"
		// 			style="border: none;"
		// 		/>`);

		panel.reveal();
	} catch (error) {
		const msg = `Failed to start Drizzle Visualizer: ${error instanceof Error ? error.message : String(error)}`;
		toastError(msg);
		logger.error(msg);
		return;
	}
}

async function loadDrizzleTsSchema(
	drizzleConfigPath: string,
	envFilePath?: string,
) {
	const pwd = await findProjectWorkingDir(drizzleConfigPath);

	logger.info("Loading drizzle config");

	const {
		default: { schema, dialect },
	} = await importModule<Config>({ path: drizzleConfigPath, envFilePath }, pwd);

	if (!schema) {
		throw new Error("Drizzle config does not have a schema");
	}

	const schemaPaths: Array<string> = [];

	if (typeof schema === "string") {
		schemaPaths.push(schema);
	} else {
		schemaPaths.push(...schema);
	}

	logger.info(`Drizzle config loaded. Schema paths: ${schemaPaths.join(", ")}`);

	const schemaFilePaths = (
		await Promise.all(
			schemaPaths.map(async (schemaPath) => {
				const pattern = path.relative(".", schemaPath);
				const baseUri = vscode.Uri.file(pwd);

				const filesUris = await vscode.workspace.findFiles({
					baseUri,
					pattern,
					base: baseUri.fsPath,
				});

				return filesUris.map((u) => u.fsPath);
			}),
		)
	).flat();

	if (schemaFilePaths.length === 0) {
		throw new Error("No schema files found");
	}

	logger.info(`Schema files paths: [${schemaFilePaths.join(", ")}]`);
	logger.info("Loading Drizzle typescript schema");

	const tsSchemas = await Promise.all(
		schemaFilePaths.map(async (path) => {
			return await importModule<Config>({ path, envFilePath }, pwd);
		}),
	);

	const tsSchema = tsSchemas.reduce(
		(acc, schema) => Object.assign(acc, schema),
		{} as Record<string, unknown>,
	);

	logger.info("Drizzle typescript schema loaded");

	return {
		tsSchema,
		dialect,
		schemaFilePaths,
	};
}
