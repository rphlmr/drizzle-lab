"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "~/lib/utils";
import { useTheme } from "../theme";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  const theme = useTheme();
  return (
    <SeparatorPrimitive.Root
      data-app="drizzle-visualizer"
      data-theme={theme}
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
