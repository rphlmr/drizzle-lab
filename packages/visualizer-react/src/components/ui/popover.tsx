import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "~/lib/utils";
import { useTheme } from "../theme";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const theme = useTheme();
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-app="drizzle-visualizer"
        data-theme-dv={theme}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "dv:bg-popover dv:text-popover-foreground dv:data-[state=open]:animate-in dv:data-[state=closed]:animate-out dv:data-[state=closed]:fade-out-0 dv:data-[state=open]:fade-in-0 dv:data-[state=closed]:zoom-out-95 dv:data-[state=open]:zoom-in-95 dv:data-[side=bottom]:slide-in-from-top-2 dv:data-[side=left]:slide-in-from-right-2 dv:data-[side=right]:slide-in-from-left-2 dv:data-[side=top]:slide-in-from-bottom-2 z-50 dv:w-72 dv:rounded-md dv:border dv:border-border dv:p-4 dv:shadow-md dv:outline-hidden",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return (
    <PopoverPrimitive.Anchor
      data-app="drizzle-visualizer"
      data-theme-dv="dark"
      data-slot="popover-anchor"
      {...props}
    />
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
