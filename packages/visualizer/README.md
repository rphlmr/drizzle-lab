# @drizzle-lab/visualizer

Visualizer for Drizzle Kit.

## Installation

```bash
npm install @drizzle-lab/visualizer@latest
```

## Usage

> [!IMPORTANT]
> Do not forget to import the CSS file.
>
> ```tsx
> import "@drizzle-lab/visualizer/dist/style.css";
> ```

```tsx
"use client";

import {
  DrizzleVisualizer,
  DrizzleVisualizerLegend,
} from "@drizzle-lab/visualizer";

import "@drizzle-lab/visualizer/dist/style.css";

import * as schema from "../database/schema";

export function Visualizer() {
  return (
    <div className="size-full flex flex-col">
      <DrizzleVisualizer schema={schema} dialect="postgresql" />
      <DrizzleVisualizerLegend />
    </div>
  );
}
```
