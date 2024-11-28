import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path from "node:path";

import { findProjectWorkingDir } from "../../context";
import { outputChannel } from "../../utils";

/* Local state */
let $port: string | undefined = undefined;
let $app: ChildProcessWithoutNullStreams | undefined = undefined;
let $processIds: number[] = [];
let $configPath: string | undefined = undefined;
let $envFilePath: string | undefined = undefined;

/* Constants */
const OutputKey = "[Visualizer]";
const extensionCwd = path.dirname(__dirname);
const appsCwd = path.join(extensionCwd, "apps");
const binPath = path.join(appsCwd, "visualizer", "server", "index.mjs");

interface ServerStartResult {
  port: string;
}

export async function startVisualizer(
  configPath: string,
  envFilePath?: string,
) {
  console.log("envFilePath", envFilePath);
  outputChannel.appendLine(`${OutputKey} extension cwd: ${extensionCwd}`);
  outputChannel.appendLine(`${OutputKey} apps cwd: ${appsCwd}`);
  outputChannel.appendLine(
    `${OutputKey} Using drizzle visualizer from: ${binPath}`,
  );

  return new Promise<ServerStartResult>(async (resolve, reject) => {
    // if config path has changed, restart the server
    if ($configPath && $configPath !== configPath) {
      outputChannel.appendLine(
        `${OutputKey} Config path changed. Killing server and restarting on port ${$port} with new config path: ${configPath}`,
      );
      stopVisualizer();
    }

    $configPath = configPath;

    // if env path has changed, restart the server
    if ($envFilePath !== envFilePath) {
      outputChannel.appendLine(
        `${OutputKey} Env file path changed. Killing server and restarting with new env file path: ${envFilePath}`,
      );
      stopVisualizer();
    }

    $envFilePath = envFilePath;

    if (!$port) {
      // random port from 60_000 to 64_000
      $port = String(Math.floor(Math.random() * 4000) + 60000);
    }

    // if app is already running on the same config path, return the existing app
    if ($app) {
      outputChannel.appendLine(
        `${OutputKey} Drizzle Visualizer server already running on port ${$port}. Reusing existing server with config path: ${$configPath}`,
      );
      return resolve({ port: $port });
    }

    const cwd = await findProjectWorkingDir($configPath);
    const drizzleEnvs = {
      DRIZZLE_LAB_CONFIG_PATH: path.relative(cwd, $configPath),
      DRIZZLE_LAB_SAVE_DIR: ".drizzle",
      DRIZZLE_LAB_PROJECT_ID: "visualizer",
      DRIZZLE_LAB_CWD: cwd,
      DRIZZLE_LAB_DEBUG: "true",
      PORT: $port,
      NODE_ENV: "production",
      TS_CONFIG_PATH: path.join(cwd, "tsconfig.json"),
      DRIZZLE_LAB_ENV_FILE_PATH: envFilePath,
    };

    $app = spawn(process.execPath, [binPath], {
      stdio: "pipe",
      detached: true,
      shell: false,
      cwd: appsCwd,
      env: {
        ...process.env,
        ...drizzleEnvs,
      },
    });

    outputChannel.appendLine(
      `${OutputKey} Started Drizzle Visualizer server with envs:\n${JSON.stringify(drizzleEnvs, null, 2)}`,
    );

    $processIds.push($app.pid!);
    console.debug("processIds registered", $processIds);

    // output from the server
    $app.stdout.on("data", (data) => {
      const output = String(data).trim();
      outputChannel.appendLine(`${OutputKey} [stdout] ${output}`);

      if (output && output.includes("Drizzle Visualizer is up and running")) {
        return resolve({ port: $port! });
      }
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

export function stopVisualizer() {
  outputChannel.appendLine(
    `${OutputKey} Stopping Drizzle Visualizer server...`,
  );
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
  $port = undefined;
  $processIds = [];

  outputChannel.appendLine(`${OutputKey} Drizzle Visualizer stopped`);
}
