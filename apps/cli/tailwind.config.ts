import preset from "@repo/ui/config/tailwind";
import type { Config } from "tailwindcss";

const config = {
  content: ["./visualizer/**/*.{ts,tsx}", ...preset.content],
  presets: [preset],
} satisfies Config;

export default config;
