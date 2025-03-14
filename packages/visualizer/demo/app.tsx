import { DrizzleVisualizer, DrizzleVisualizerLegend } from "../src";
import * as schema from "./schema";

import "../src/styles.css";

export default function App() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
      }}
    >
      <DrizzleVisualizer dialect="postgresql" schema={schema} theme="light" />
      <DrizzleVisualizerLegend theme="light" />
    </div>
  );
}
