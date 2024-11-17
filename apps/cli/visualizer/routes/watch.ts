import { useEffect } from "react";

import {
  importDrizzleConfig,
  DRIZZLE_LAB_ENV_KEY,
} from "@drizzle-lab/api/config/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useRevalidator } from "@remix-run/react";
import { watch } from "chokidar";
import { useEventSource } from "remix-utils/sse/react";
import { eventStream } from "remix-utils/sse/server";

type EventType = "change" | "hello";
type SendFunction = (args: { event: EventType; data: string }) => void;

export async function loader({ request }: LoaderFunctionArgs) {
  const abortController = new AbortController();
  abortController.signal.addEventListener("abort", () =>
    abortController.abort(),
  );

  const configPath = process.env[DRIZZLE_LAB_ENV_KEY.CONFIG_PATH];
  const config = await importDrizzleConfig(configPath);

  const watcher = watch(config.schema, {
    ignoreInitial: true,
    ignored: (path, stats) => Boolean(stats?.isFile() && !path.endsWith(".ts")),
  });

  return eventStream(
    AbortSignal.any([request.signal, abortController.signal]),
    (send: SendFunction) => {
      function notify(event: EventType) {
        try {
          send({ event, data: new Date().toISOString() });
        } catch (cause) {
          if (
            cause instanceof Error &&
            !cause.message.includes("Controller is already closed")
          ) {
            console.error("Failed to send SSE event", cause);
          }
        }
      }

      watcher
        .on("change", () => {
          notify("change");
        })
        .on("add", () => {
          notify("change");
        })
        .on("unlink", () => {
          notify("change");
        })
        .on("ready", () => {
          notify("hello");
        });

      return function clear() {};
    },
  );
}

export function useWatch() {
  const { revalidate } = useRevalidator();
  const event = useEventSource("watch", {
    event: "change" satisfies EventType,
  });

  useEffect(
    function revalidateOnChange() {
      if (event) {
        revalidate();
      }
    },
    [event, revalidate],
  );
}
