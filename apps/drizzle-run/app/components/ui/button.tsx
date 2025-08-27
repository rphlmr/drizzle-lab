import * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "~/utils/cn";

const buttonVariants = cva(
  "dzl-inline-flex dzl-justify-center dzl-items-center dzl-disabled:opacity-50 dzl-rounded-md dzl-focus-visible:outline-none dzl-focus-visible:ring-1 dzl-focus-visible:ring-ring dzl-font-medium dzl-text-foreground dzl-text-sm dzl-whitespace-nowrap dzl-transition-colors",
  {
    variants: {
      variant: {
        default: "dzl-bg-primary dzl-text-primary-foreground dzl-shadow dzl-hover:bg-primary/90",
        destructive: "dzl-bg-destructive dzl-text-destructive-foreground dzl-shadow-sm dzl-hover:bg-destructive/90",
        outline:
          "dzl-border dzl-border-input dzl-bg-background dzl-shadow-sm dzl-hover:bg-accent dzl-hover:text-accent-foreground",
        secondary: "dzl-bg-secondary dzl-text-secondary-foreground dzl-shadow-sm dzl-hover:bg-secondary/80",
        ghost:
          "dzl-group-[.active]:bg-accent dzl-group-[.active]:text-accent-foreground dzl-hover:bg-accent dzl-hover:text-accent-foreground",
        link: "dzl-text-primary dzl-underline-offset-4 dzl-hover:underline",
      },
      size: {
        default: "dzl-h-9 dzl-px-4 dzl-py-2",
        custom: "",
        sm: "dzl-h-8 dzl-rounded-md dzl-px-3 dzl-text-xs",
        lg: "dzl-h-10 dzl-rounded-md dzl-px-8",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        // eslint-disable-next-line tailwindcss/no-custom-classname
        className={cn(buttonVariants({ variant, size, className }), props.disabled && "dzl-disabled dzl-group")}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
