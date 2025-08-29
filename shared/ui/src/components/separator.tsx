import * as React from "react";

import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "../utils/cn";

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref,
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "dzl-shrink-0 dzl-bg-border",
        orientation === "horizontal"
          ? "dzl-h-px dzl-w-full"
          : "dzl-h-full dzl-w-px",
        className,
      )}
      {...props}
    />
  ),
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
