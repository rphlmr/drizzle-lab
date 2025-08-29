import React from "react";

import { type HighlighterCore, createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

import tokyoNight from "@shikijs/themes/tokyo-night";

declare global {
  interface Window {
    __highlighter: HighlighterCore | null;
    __highlighterPromise: Promise<HighlighterCore> | null;
  }
}

const createHighlighterInstance = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.__highlighterPromise) {
    window.__highlighterPromise = createHighlighterCore({
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
      langs: [import("@shikijs/langs/sql"), import("@shikijs/langs/typescript")],
      engine: createOnigurumaEngine(import("shiki/wasm")),
    }).then((instance) => {
      window.__highlighter = instance;
      return instance;
    });
  }

  return window.__highlighterPromise;
};

export function useHighlighter() {
  const [highlighter, setHighlighter] = React.useState<HighlighterCore | null>(
    typeof window !== "undefined" ? window.__highlighter : null
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
