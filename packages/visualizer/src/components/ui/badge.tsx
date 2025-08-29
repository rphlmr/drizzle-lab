import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "~/lib/utils";
import { useTheme } from "../theme";

const badgeVariants = cva(
  "dv:inline-flex dv:justify-center dv:items-center dv:gap-1 dv:px-2 dv:py-0.5 dv:border dv:rounded-md dv:focus-visible:outline-1 dv:dark:outline-ring/40 dv:outline-ring/50 dv:aria-invalid:focus-visible:ring-0 dv:focus-visible:ring-4 dv:dark:ring-ring/20 dv:ring-ring/10 dv:w-fit dv:[&>svg]:size-3 dv:font-semibold dv:text-xs dv:whitespace-nowrap dv:transition-[color,box-shadow] dv:[&>svg]:pointer-events-none dv:shrink-0",
  {
    variants: {
      variant: {
        default:
          "dv:border-transparent dv:bg-primary dv:text-primary-foreground dv:shadow-sm dv:[&]:hover:bg-primary/90",
        secondary: "dv:border-transparent dv:bg-secondary dv:text-secondary-foreground dv:[&]:hover:bg-secondary/90",
        destructive:
          "dv:border-transparent dv:bg-destructive dv:text-destructive-foreground dv:shadow-sm dv:[&]:hover:bg-destructive/90",
        outline: "dv:text-foreground dv:[&]:hover:bg-accent dv:[&]:hover:text-accent-foreground dv:border-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const theme = useTheme();
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-app="drizzle-visualizer"
      data-theme={theme}
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
