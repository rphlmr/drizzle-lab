import React from "react";

import { createHighlighter, type Highlighter } from "shiki/bundle/web";
import tokyoNight from "shiki/themes/tokyo-night.mjs";

// export const highlighter = await createHighlighter({
//   themes: [
//     {
//       ...tokyoNight,
//       colors: {
//         ...tokyoNight.colors,
//         "editor.background": "transparent",
//         "editorGutter.background": "#00000000",
//       },
//     },
//   ],
//   langs: ["sql", "typescript"],
// });

declare global {
  interface Window {
    __highlighter: Highlighter | null;
    __highlighterPromise: Promise<Highlighter> | null;
  }
}

const createHighlighterInstance = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.__highlighterPromise) {
    window.__highlighterPromise = createHighlighter({
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
    }).then((instance) => {
      window.__highlighter = instance;
      return instance;
    });
  }

  return window.__highlighterPromise;
};

export function useHighlighter() {
  const [highlighter, setHighlighter] = React.useState<Highlighter | null>(
    typeof window !== "undefined" ? window.__highlighter : null,
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const promise = createHighlighterInstance();
    if (promise) {
      promise.then(setHighlighter);
    }

    return () => {
      setHighlighter(null);
    };
  }, []);

  return highlighter;
}
