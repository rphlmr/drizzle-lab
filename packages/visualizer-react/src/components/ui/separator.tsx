"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "~/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-app="drizzle-visualizer"
      data-theme-dv="dark"
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "dv:bg-border dv:shrink-0 dv:data-[orientation=horizontal]:h-px dv:data-[orientation=horizontal]:w-full dv:data-[orientation=vertical]:h-full dv:data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
