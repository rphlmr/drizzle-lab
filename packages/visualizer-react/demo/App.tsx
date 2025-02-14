import { DrizzleVisualizer } from "../src";
import * as schema from "./schema";

import "../src/styles.css";

export default function App() {
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <DrizzleVisualizer dialect="postgresql" schema={schema} />
    </div>
  );
}
