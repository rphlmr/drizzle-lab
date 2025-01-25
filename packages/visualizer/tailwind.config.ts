import preset from "@repo/ui/config/tailwind";
import type { Config } from "tailwindcss";

const config = {
  content: preset.content,
  darkMode: "class",
  presets: [preset],
  prefix: "dzl-",
  corePlugins: {
    preflight: false,
  },
} satisfies Config;

export default config;
