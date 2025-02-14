import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const toggleVariants = cva(
  "dv:inline-flex dv:items-center dv:justify-center dv:gap-2 dv:rounded-md dv:text-sm dv:font-medium dv:transition-colors dv:hover:bg-muted dv:hover:text-muted-foreground dv:disabled:pointer-events-none dv:disabled:opacity-50 dv:data-[state=on]:bg-accent dv:data-[state=on]:text-accent-foreground dv:[&_svg]:pointer-events-none dv:[&_svg:not([class*='size-'])]:size-4 dv:[&_svg]:shrink-0 dv:ring-ring/10 dv:dark:ring-ring/20 dv:dark:outline-ring/40 dv:outline-ring/50 dv:focus-visible:ring-4 dv:focus-visible:outline-1 dv:aria-invalid:focus-visible:ring-0 dv:transition-[color,box-shadow]",
  {
    variants: {
      variant: {
        default: "dv:bg-transparent",
        outline:
          "dv:border dv:border-input dv:bg-transparent dv:shadow-xs dv:hover:bg-accent dv:hover:text-accent-foreground",
      },
      size: {
        default: "dv:h-9 dv:px-2 dv:min-w-9",
        sm: "dv:h-8 dv:px-1.5 dv:min-w-8",
        lg: "dv:h-10 dv:px-2.5 dv:min-w-10",
        ["icon:sm"]: "dv:size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-app="drizzle-visualizer"
      data-theme-dv="dark"
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
