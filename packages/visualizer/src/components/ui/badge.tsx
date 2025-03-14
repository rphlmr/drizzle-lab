import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";
import { useTheme } from "../theme";

const badgeVariants = cva(
  "dv:inline-flex dv:items-center dv:justify-center dv:rounded-md dv:border dv:px-2 dv:py-0.5 dv:text-xs dv:font-semibold dv:w-fit dv:whitespace-nowrap dv:shrink-0 dv:[&>svg]:size-3 dv:gap-1 dv:[&>svg]:pointer-events-none dv:ring-ring/10 dv:dark:ring-ring/20 dv:dark:outline-ring/40 dv:outline-ring/50 dv:focus-visible:ring-4 dv:focus-visible:outline-1 dv:aria-invalid:focus-visible:ring-0 dv:transition-[color,box-shadow]",
  {
    variants: {
      variant: {
        default:
          "dv:border-transparent dv:bg-primary dv:text-primary-foreground dv:shadow-sm dv:[&]:hover:bg-primary/90",
        secondary:
          "dv:border-transparent dv:bg-secondary dv:text-secondary-foreground dv:[&]:hover:bg-secondary/90",
        destructive:
          "dv:border-transparent dv:bg-destructive dv:text-destructive-foreground dv:shadow-sm dv:[&]:hover:bg-destructive/90",
        outline:
          "dv:text-foreground dv:[&]:hover:bg-accent dv:[&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const theme = useTheme();
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-app="drizzle-visualizer"
      data-theme-dv={theme}
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
