import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// set the timezone to UTC to avoid issues with timezones in the database
// vite dotenv doesn't allow to override an existing env variable
process.env.TZ = "UTC";

export default defineConfig({
  server: {
    host: true,
    port: 3000,
  },
  optimizeDeps: {
    exclude: ["@electric-sql/pglite", "@libsql/client-wasm"],
  },
  build: {
    target: "esnext",
    assetsInlineLimit: 0,
  },
  plugins: [reactRouterHonoServer(), tailwindcss(), reactRouter(), tsconfigPaths()],
});
