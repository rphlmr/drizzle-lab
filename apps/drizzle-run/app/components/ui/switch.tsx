import * as React from "react";

import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "~/utils/cn";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex items-center data-[state=checked]:bg-primary data-[state=unchecked]:bg-input disabled:opacity-50 shadow-sm border-2 border-transparent rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background w-9 h-5 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "block bg-background shadow-lg rounded-full ring-0 size-4 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 pointer-events-none"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
