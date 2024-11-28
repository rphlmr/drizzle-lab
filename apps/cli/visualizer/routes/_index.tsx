import fs from "node:fs/promises";
import path from "node:path";

import {
  importDrizzleConfig,
  DRIZZLE_LAB_ENV_KEY,
  getEnv,
} from "@drizzle-lab/api/config/node";
import {
  DrizzleVisualizer,
  DrizzleVisualizerLegend,
} from "@drizzle-lab/visualizer";
import type { NodePosition } from "@drizzle-lab/visualizer";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import type { ShouldRevalidateFunctionArgs } from "@remix-run/react";
import {
  data,
  isRouteErrorResponse,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { Alert } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { ClientOnly } from "remix-utils/client-only";
import { useDebouncedCallback } from "use-debounce";

import { useWatch } from "./watch";

export const meta: MetaFunction = () => {
  return [{ title: "Drizzle Lab - Visualizer" }];
};

export const shouldRevalidate = ({
  defaultShouldRevalidate,
  formMethod,
}: ShouldRevalidateFunctionArgs) => {
  // we don't want to revalidate after saving nodes positions
  if (formMethod === "POST") {
    return false;
  }

  return defaultShouldRevalidate;
};

const saveDir = path.resolve(
  process.env[DRIZZLE_LAB_ENV_KEY.CWD] || "",
  process.env[DRIZZLE_LAB_ENV_KEY.SAVE_DIR] || ".drizzle-lab",
);

export async function loader() {
  try {
    const configPath = process.env[DRIZZLE_LAB_ENV_KEY.CONFIG_PATH];
    const config = await importDrizzleConfig(configPath);
    const saveFilePath = path.join(saveDir, `${config.projectId}.json`);

    let initialNodesPositions: NodePosition[] = [];

    try {
      initialNodesPositions = JSON.parse(
        await fs.readFile(saveFilePath, "utf-8"),
      ) as NodePosition[];
    } catch (e) {
      if (getEnv().DRIZZLE_LAB_DEBUG) {
        console.warn(
          `Using default nodes positions. Reason is: ${
            e instanceof Error ? e.message : "unknown"
          }`,
        );
      }
    }

    switch (config.dialect) {
      case "postgresql": {
        const { drizzleObjectsToSnapshot, importFromFiles } = await import(
          "@drizzle-lab/api/pg/node"
        );
        const drizzleObjects = await importFromFiles(config.schema);
        const snapshot = drizzleObjectsToSnapshot(drizzleObjects, config);

        return { snapshot, initialNodesPositions };
      }

      case "turso":
      case "sqlite": {
        const { drizzleObjectsToSnapshot, importFromFiles } = await import(
          "@drizzle-lab/api/sqlite/node"
        );
        const drizzleObjects = await importFromFiles(config.schema);
        const snapshot = drizzleObjectsToSnapshot(drizzleObjects, config);

        return { snapshot, initialNodesPositions };
      }

      case "mysql": {
        const { drizzleObjectsToSnapshot, importFromFiles } = await import(
          "@drizzle-lab/api/mysql/node"
        );
        const drizzleObjects = await importFromFiles(config.schema);
        const snapshot = drizzleObjectsToSnapshot(drizzleObjects, config);

        return { snapshot, initialNodesPositions };
      }

      default: {
        throw new Error(`Unsupported dialect: ${config.dialect}`);
      }
    }
  } catch (error) {
    console.error("Error loading snapshot", error);
    throw data((error as Error).message, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const configPath = process.env[DRIZZLE_LAB_ENV_KEY.CONFIG_PATH];
    const config = await importDrizzleConfig(configPath);
    const saveFilePath = path.join(saveDir, `${config.projectId}.json`);
    const nodesPositions = (await request.json()) as NodePosition[];
    await fs.mkdir(saveDir, { recursive: true });
    await fs.writeFile(saveFilePath, JSON.stringify(nodesPositions));
  } catch (error) {
    console.error("Error saving nodes positions", error);
  }

  return null;
}

export default function Index() {
  useWatch();
  const { snapshot, initialNodesPositions } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const saveChanges = useDebouncedCallback(
    (updates: Parameters<typeof fetcher.submit>[0]) => {
      fetcher.submit(updates, {
        method: "POST",
        encType: "application/json",
      });
    },
    250,
  );

  return (
    <div className="relative flex size-full flex-col">
      {/* <div className="absolute left-0 top-0 z-50 flex w-full items-center justify-center">
        <span className="text-sm font-medium">Drizzle Lab - Visualizer</span>
      </div> */}
      <Alert className="pointer-events-none absolute top-0 z-10 flex w-full flex-col border-none bg-transparent">
        <span className="text-sm font-bold text-muted-foreground/50">
          Drizzle Lab - Visualizer
        </span>
        <p className="text-sm text-muted-foreground/30">
          It can still have bugs!
        </p>
      </Alert>
      <ClientOnly fallback={<p>Loading...</p>}>
        {() => (
          <>
            <DrizzleVisualizer
              snapshot={snapshot}
              initialNodesPositions={initialNodesPositions}
              onNodesPositionsChange={saveChanges}
            />
            <DrizzleVisualizerLegend />
          </>
        )}
      </ClientOnly>
    </div>
  );
}

export function ErrorBoundary() {
  useWatch();
  const error = useRouteError();
  let message = "Unknown error";

  if (isRouteErrorResponse(error)) {
    message = error.data;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex size-full flex-col items-center justify-center gap-4 overflow-hidden p-4">
      <span className="text-sm font-bold">Something went wrong ⛈️</span>
      <span className="text-sm text-muted-foreground">
        JavaScript is harder than we think. It drives me crazy.
      </span>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Refresh
      </Button>
      <img src="error.webp" alt="Error" />
      <span className="text-center text-sm font-bold text-rose-600">
        {message}
      </span>
    </div>
  );
}
