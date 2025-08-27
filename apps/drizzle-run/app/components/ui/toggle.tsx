import * as React from "react";

import * as TogglePrimitive from "@radix-ui/react-toggle";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "~/utils/cn";

const toggleVariants = cva(
  "dzl-group dzl-inline-flex dzl-justify-center dzl-items-center dzl-data-[state=on]:bg-accent dzl-hover:bg-muted dzl-disabled:opacity-50 dzl-rounded-md dzl-focus-visible:outline-none dzl-focus-visible:ring-1 dzl-focus-visible:ring-ring dzl-font-medium dzl-hover:text-muted-foreground dzl-text-sm dzl-transition-colors dzl-data-[state=on]:text-accent-foreground dzl-disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "dzl-bg-transparent",
        outline:
          "dzl-border dzl-border-border dzl-border-input dzl-bg-transparent dzl-shadow-sm dzl-hover:bg-accent dzl-hover:text-accent-foreground",
      },
      size: {
        default: "dzl-h-9 dzl-px-3",
        sm: "dzl-h-8 dzl-px-2",
        lg: "dzl-h-10 dzl-px-3",
        icon: "dzl-size-9",
        ["icon:sm"]: "dzl-size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
