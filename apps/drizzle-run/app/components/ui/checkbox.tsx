import * as React from "react";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";

import { cn } from "~/utils/cn";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer data-[state=checked]:bg-primary disabled:opacity-50 shadow border border-primary rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring size-4 data-[state=checked]:text-primary-foreground disabled:cursor-not-allowed shrink-0",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("flex justify-center items-center text-current")}>
      <CheckIcon className="size-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
