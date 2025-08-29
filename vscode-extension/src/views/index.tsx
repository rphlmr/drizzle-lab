import { DrizzleVisualizer } from "@drizzle-lab/visualizer";
import "@drizzle-lab/visualizer/style.css";
import React from "react";
import { createRoot } from "react-dom/client";

declare global {
  interface Window {
    vscode: any;
    initialData: {
      snapshot: any;
    };
  }
}

function App() {
  const [data, setData] = React.useState(window.initialData);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "reload") {
        setData((prev) => ({
          ...prev,
          snapshot: message.snapshot,
        }));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return <DrizzleVisualizer snapshot={data.snapshot} />;
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("Failed to find the root container");
}

const root = createRoot(container);
root.render(<App />);
