import * as React from "react";

import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "../utils/cn";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "dzl-z-50 dzl-w-72 dzl-rounded-md dzl-border-border dzl-border dzl-bg-popover dzl-p-4 dzl-text-popover-foreground dzl-shadow-md dzl-outline-none dzl-data-[state=open]:animate-in dzl-data-[state=closed]:animate-out dzl-data-[state=closed]:fade-out-0 dzl-data-[state=open]:fade-in-0 dzl-data-[state=closed]:zoom-out-95 dzl-data-[state=open]:zoom-in-95 dzl-data-[side=bottom]:slide-in-from-top-2 dzl-data-[side=left]:slide-in-from-right-2 dzl-data-[side=right]:slide-in-from-left-2 dzl-data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
