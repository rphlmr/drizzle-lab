import esbuild from "esbuild";
import { execSync } from "node:child_process";
import fs from "node:fs";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const esbuildProblemMatcherPlugin: esbuild.Plugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }: any) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`,
        );
      });
      console.log("[watch] build finished");
    });
  },
};

async function main() {
  // build drizzle-lab
  console.log("Building drizzle-lab...");
  execSync("npm run -w drizzle-lab build-all", { cwd: "..", stdio: "inherit" });

  const visualizerDir = "apps/visualizer";
  // copy bundled drizzle-lab visualizer to dist
  if (fs.existsSync(visualizerDir)) {
    fs.rmSync(visualizerDir, { recursive: true, force: true });
  }
  fs.mkdirSync(visualizerDir, { recursive: true });
  fs.cpSync("../apps/cli/dist/visualizer", visualizerDir, { recursive: true });
  fs.copyFileSync(
    "../apps/cli/dist/package.json",
    `${visualizerDir}/package.json`,
  );

  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "silent",
    packages: "bundle",
    plugins: [
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin,
    ],
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
