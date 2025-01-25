"use client";

import {
  DrizzleVisualizer,
  DrizzleVisualizerLegend,
} from "@drizzle-lab/visualizer";
import "@drizzle-lab/visualizer/dist/style.css";

import * as schema from "../database/schema";
import React from "react";

export function Visualizer() {
  return (
    <div className="size-full flex flex-col">
      <DrizzleVisualizer schema={schema} dialect="postgresql" />
      <DrizzleVisualizerLegend />
    </div>
  );
}

const emptySubscribe = () => () => {};

/**
 * Check if rendering on client side
 */
export function useClientReady() {
  const clientReady = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return clientReady;
}

/**
 * Render component only on client side
 */
export function ClientOnly({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const key = React.useId();
  const clientReady = useClientReady();

  return clientReady ? (
    <React.Fragment key={key}>{children}</React.Fragment>
  ) : (
    fallback || null
  );
}
