import * as React from "react";

import * as TogglePrimitive from "@radix-ui/react-toggle";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "~/utils/cn";

const toggleVariants = cva(
  "group inline-flex justify-center items-center data-[state=on]:bg-accent hover:bg-muted disabled:opacity-50 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium hover:text-muted-foreground text-sm transition-colors data-[state=on]:text-accent-foreground cursor-pointer disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2",
        lg: "h-10 px-3",
        icon: "size-9",
        "icon:sm": "size-8",
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
