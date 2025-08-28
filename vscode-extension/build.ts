import esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const esbuildProblemMatcherPlugin: esbuild.Plugin = {
	name: "esbuild-problem-matcher",

	setup(build) {
		build.onStart(() => {
			console.log(
				"[watch] build started for",
				build.initialOptions.entryPoints,
			);
		});
		build.onEnd((result) => {
			for (const { text, location } of result.errors) {
				console.error(`✘ [ERROR] ${text}`);
				console.error(
					location
						? `${location.file}:${location.line}:${location.column}:`
						: "No location",
				);
			}

			console.log(
				"[watch] build finished for",
				build.initialOptions.entryPoints,
			);
		});
	},
};

async function main() {
	const extensionCtx = await esbuild.context({
		entryPoints: [{ in: "src/extension.ts", out: "extension" }],
		bundle: true,
		format: "cjs",
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: "node",
		outdir: "dist",
		external: ["vscode"],
		logLevel: "silent",
		packages: "bundle",
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});

	const webviewCtx = await esbuild.context({
		entryPoints: [{ in: "src/views/index.tsx", out: "views/index" }],
		bundle: true,
		format: "cjs",
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: "browser",
		outdir: "dist",
		external: ["vscode"],
		logLevel: "silent",
		packages: "bundle",
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});

	if (watch) {
		await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
	} else {
		await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
		await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()]);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
