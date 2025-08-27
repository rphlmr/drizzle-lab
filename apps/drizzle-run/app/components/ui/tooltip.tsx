import * as React from "react";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "~/utils/cn";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "dzl-data-[side=left]:slide-in-from-right-2 dzl-data-[side=top]:slide-in-from-bottom-2 dzl-z-50 dzl-bg-secondary dzl-data-[side=bottom]:slide-in-from-top-2 dzl-data-[side=right]:slide-in-from-left-2 dzl-px-3 dzl-py-1.5 dzl-rounded-md dzl-overflow-hidden dzl-text-secondary-foreground dzl-text-xs dzl-animate-in dzl-data-[state=closed]:animate-out dzl-fade-in-0 dzl-zoom-in-95 dzl-data-[state=closed]:fade-out-0 dzl-data-[state=closed]:zoom-out-95",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
