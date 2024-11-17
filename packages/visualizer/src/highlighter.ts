import { createHighlighter } from "shiki/bundle/web";
import tokyoNight from "shiki/themes/tokyo-night.mjs";

export const highlighter = await createHighlighter({
  themes: [
    {
      ...tokyoNight,
      colors: {
        ...tokyoNight.colors,
        "editor.background": "transparent",
        "editorGutter.background": "#00000000",
      },
    },
  ],
  langs: ["sql", "typescript"],
});
