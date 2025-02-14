"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "~/lib/utils";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root
        data-app="drizzle-visualizer"
        data-theme-dv="dark"
        data-slot="tooltip"
        {...props}
      />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return (
    <TooltipPrimitive.Trigger
      data-app="drizzle-visualizer"
      data-theme-dv="dark"
      data-slot="tooltip-trigger"
      {...props}
    />
  );
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-app="drizzle-visualizer"
        data-theme-dv="dark"
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "dv:bg-primary dv:text-primary-foreground dv:animate-in dv:fade-in-0 dv:zoom-in-95 dv:data-[state=closed]:animate-out dv:data-[state=closed]:fade-out-0 dv:data-[state=closed]:zoom-out-95 dv:data-[side=bottom]:slide-in-from-top-2 dv:data-[side=left]:slide-in-from-right-2 dv:data-[side=right]:slide-in-from-left-2 dv:data-[side=top]:slide-in-from-bottom-2 z-50 dv:max-w-sm dv:rounded-md dv:px-3 dv:py-1.5 dv:text-xs",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          data-app="drizzle-visualizer"
          data-theme-dv="dark"
          className="dv:bg-primary dv:fill-primary z-50 dv:size-2.5 dv:translate-y-[calc(-50%_-_2px)] dv:rotate-45 dv:rounded-[2px]"
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
