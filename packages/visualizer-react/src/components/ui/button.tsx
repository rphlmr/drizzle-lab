import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "dv:inline-flex dv:items-center dv:justify-center dv:gap-2 dv:whitespace-nowrap dv:rounded-md dv:text-sm dv:font-medium dv:transition-[color,box-shadow] dv:disabled:pointer-events-none dv:disabled:opacity-50 dv:[&_svg]:pointer-events-none dv:[&_svg:not([class*='size-'])]:size-4 dv:[&_svg]:shrink-0 dv:ring-ring/10 dv:dark:ring-ring/20 dv:dark:outline-ring/40 dv:outline-ring/50 dv:focus-visible:ring-4 dv:focus-visible:outline-1 dv:aria-invalid:focus-visible:ring-0 dv:text-inherit dv:cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "dv:bg-primary dv:text-primary-foreground dv:shadow-sm dv:hover:bg-primary/90",
        destructive:
          "dv:bg-destructive dv:text-destructive-foreground dv:shadow-xs dv:hover:bg-destructive/90",
        outline:
          "dv:border dv:border-input dv:bg-background dv:shadow-xs dv:hover:bg-accent dv:hover:text-accent-foreground",
        secondary:
          "dv:bg-secondary dv:text-secondary-foreground dv:shadow-xs dv:hover:bg-secondary/80",
        ghost:
          "dv:hover:bg-accent dv:hover:text-accent-foreground dv:bg-transparent",
        link: "dv:text-primary dv:underline-offset-4 dv:hover:underline",
      },
      size: {
        default: "dv:h-9 dv:px-4 dv:py-2 dv:has-[>svg]:dv:px-3",
        sm: "dv:h-8 dv:rounded-md dv:px-3 dv:has-[>svg]:dv:px-2.5",
        lg: "dv:h-10 dv:rounded-md dv:px-6 dv:has-[>svg]:dv:px-4",
        icon: "dv:size-9",
        custom: "",
        ["icon:sm"]: "dv:size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        data-app="drizzle-visualizer"
        data-theme-dv="dark"
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

export { Button, buttonVariants };
