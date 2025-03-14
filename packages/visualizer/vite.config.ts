import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dts from "vite-plugin-dts";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      rollupTypes: true,
    }),
    tsconfigPaths(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      // the proper extensions will be added
      fileName: "index",
      formats: ["es"],
      cssFileName: "style",
    },
    copyPublicDir: false,
    minify: false,
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["react", "react/jsx-runtime", "drizzle-orm"],
    },
  },
});
