import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { findProjectWorkingDir, getWorkspaceRootFolder } from "../../context";
import { outputChannel } from "../../utils";

/* Local state */
let $app: ChildProcessWithoutNullStreams | undefined = undefined;
let $processIds: number[] = [];
let $configPath: string | undefined = undefined;

/* Constants */
const OutputKey = "[Studio]";

export async function startStudio(configPath: string, envFile?: string) {
  return new Promise<void>(async (resolve, reject) => {
    // if config path has changed, restart the server
    if ($configPath && $configPath !== configPath) {
      outputChannel.appendLine(
        `${OutputKey} Config path changed. Killing server and restarting with new config path: ${configPath}`,
      );
      stopStudio();
    }

    $configPath = configPath;

    // if app is already running on the same config path, return the existing app
    if ($app) {
      outputChannel.appendLine(
        `${OutputKey} Drizzle Studio server already running. Reusing existing server with config path: ${$configPath}`,
      );
      return resolve();
    }

    const envFileArg = envFile ? ["--env-file", envFile] : [];
    outputChannel.appendLine(
      `${OutputKey} Using env file: ${envFile ? envFile : "none"}`,
    );

    const drizzleKitPath = findDrizzleKitPath($configPath);

    if (!drizzleKitPath) {
      return reject(
        new Error(
          `${OutputKey} Drizzle Kit not found. Please install it first.`,
        ),
      );
    }

    outputChannel.appendLine(
      `${OutputKey} Drizzle Kit found at: ${drizzleKitPath}`,
    );

    $app = spawn(
      process.execPath,
      [
        ...envFileArg,
        drizzleKitPath,
        "studio",
        "--config",
        $configPath,
        "--verbose",
      ],
      {
        stdio: "pipe",
        detached: true,
        shell: false,
        cwd: await findProjectWorkingDir($configPath),
        env: {
          ...process.env,
          NODE_ENV: "production",
        },
      },
    );

    $processIds.push($app.pid!);
    console.debug("processIds registered", $processIds);

    // output from the server
    $app.stdout.on("data", (data) => {
      const output = String(data).trim();
      outputChannel.appendLine(`${OutputKey} [stdout] ${output}`);
      return resolve();
    });

    // error from the server
    $app.stderr.on("data", (error) => {
      outputChannel.appendLine(`${OutputKey} [stderr] ${String(error)}`);
      reject(error);
    });

    $app.on("error", (error) => {
      console.error(`${OutputKey} process error`, error);
    });
  });
}

export function stopStudio() {
  outputChannel.appendLine(`${OutputKey} Stopping Drizzle Studio server...`);
  console.debug("killable processIds", $processIds);

  $processIds.forEach((pid) => {
    try {
      // On Windows, we need to kill the entire process tree
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", pid.toString(), "/F", "/T"]);
      } else {
        console.debug("Killing process", pid);
        // On Unix-like systems, negative pid kills the process group
        process.kill(-pid, "SIGINT");
      }
    } catch (error) {
      outputChannel.appendLine(`${OutputKey} Failed to kill server: ${error}`);
    }
  });

  $app = undefined;
  $processIds = [];

  outputChannel.appendLine(`${OutputKey} Drizzle Studio stopped`);
}

export function findDrizzleKitPath(configPath: string) {
  const cwd = getWorkspaceRootFolder(configPath);

  const drizzleKitPath = path.join(
    cwd,
    "node_modules",
    "drizzle-kit",
    "bin.cjs",
  );

  if (!fs.existsSync(drizzleKitPath)) {
    return null;
  }

  return drizzleKitPath;
}
