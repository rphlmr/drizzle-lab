import { vitePlugin as remix } from "@remix-run/dev";
import { devServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// import { remixDevTools } from "remix-development-tools";

// set the timezone to UTC to avoid issues with timezones in the database
// vite dotenv doesn't allow to override an existing env variable
process.env.TZ = "UTC";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true; // 👈 enable _types_ for single-fetch
  }
}

export default defineConfig({
  server: {
    host: true,
    port: 3000,
  },
  optimizeDeps: {
    exclude: [
      "@electric-sql/pglite",
      "@electric-sql/pglite-v1",
      "@libsql/client-wasm",
    ],
  },
  build: {
    target: "esnext",
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // required to be able to async import ... (vite issue?)
        manualChunks: (id) => {
          if (id.includes("@electric-sql/pglite-v1")) {
            return "@electric-sql/pglite-v1";
          }
        },
      },
    },
  },
  plugins: [
    // remixDevTools({
    //   client: {
    //     hideUntilHover: true,
    //   },
    // }),
    devServer(),
    remix({
      future: {
        v3_singleFetch: true,
        v3_fetcherPersist: true,
        unstable_optimizeDeps: true,
      },
    }),
    tsconfigPaths(),
  ],
});
