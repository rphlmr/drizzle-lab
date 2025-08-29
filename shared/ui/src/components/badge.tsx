import type * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../utils/cn";

const badgeVariants = cva(
  "dzl-inline-flex dzl-items-center dzl-rounded-md dzl-border dzl-px-2.5 dzl-py-0.5 dzl-text-xs dzl-font-semibold dzl-transition-colors dzl-focus:outline-none dzl-focus:ring-2 dzl-focus:ring-ring dzl-focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "dzl-border-transparent dzl-bg-primary dzl-text-primary-foreground dzl-shadow dzl-hover:dzl-bg-primary/80",
        secondary:
          "dzl-border-transparent dzl-bg-secondary dzl-text-secondary-foreground dzl-hover:dzl-bg-secondary/80",
        destructive:
          "dzl-border-transparent dzl-bg-destructive dzl-text-destructive-foreground dzl-shadow dzl-hover:dzl-bg-destructive/80",
        outline: "dzl-text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
