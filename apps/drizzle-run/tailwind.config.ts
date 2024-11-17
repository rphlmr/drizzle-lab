import preset from "@repo/ui/config/tailwind";
import type { Config } from "tailwindcss";

const config = {
  content: preset.content,
  presets: [preset],
} satisfies Config;

export default config;
