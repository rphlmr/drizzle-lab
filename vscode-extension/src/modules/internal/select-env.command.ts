import * as vscode from "vscode";

export const SelectEnvCommand = "drizzle:select_env";

/* Local state */
let $lastSelectedEnv: string | undefined;

export async function SelectEnv(configPath: string, executeCommand: string) {
	// Find .env files in the workspace
	const envFiles = await vscode.workspace.findFiles(
		"**/.env*",
		"**/node_modules/**",
	);

	// Create quick pick items
	const items = envFiles.map((file) => ({
		label: vscode.workspace.asRelativePath(file),
		path: file.fsPath,
	}));

	// Add option to not use an env file
	items.unshift({ label: "None", path: "Don't use an env file" });

	// Move last selected item to top if it exists
	if ($lastSelectedEnv) {
		const lastSelectedIndex = items.findIndex(
			(item) => item.path === $lastSelectedEnv,
		);
		if (lastSelectedIndex > -1) {
			const [lastItem] = items.splice(lastSelectedIndex, 1);
			items.unshift(lastItem);
		}
	}

	// Show quick pick
	const selected = await vscode.window.showQuickPick(items, {
		placeHolder: "Select an environment file",
	});

	if (selected) {
		// Save the selection to workspace configuration (except for "None")
		if (selected.label !== "None") {
			$lastSelectedEnv = selected.path;
		}

		// Call open studio command with the selected env file
		await vscode.commands.executeCommand(
			executeCommand,
			configPath,
			selected.label === "None" ? undefined : selected.path,
		);
	}
}
