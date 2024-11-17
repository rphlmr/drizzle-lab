import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { devServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import pkg from "./package.json";

installGlobals();

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  ssr:
    process.env.NODE_ENV === "production"
      ? {
          noExternal: true,
          external: ["fsevents", ...Object.keys(pkg.devDependencies)],
          target: "node",
        }
      : undefined,
  plugins: [
    devServer({
      appDirectory: "visualizer",
    }),
    remix({
      serverModuleFormat: "esm",
      serverBuildFile: "index.mjs",
      appDirectory: "visualizer",
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
        unstable_optimizeDeps: true,
      },
      buildDirectory: "dist/visualizer",
    }),
    tsconfigPaths(),
  ],
});
