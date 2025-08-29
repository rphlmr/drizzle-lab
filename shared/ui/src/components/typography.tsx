import * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "../utils/cn";

const typographyVariants = cva("text-foreground", {
  variants: {
    variant: {
      h1: "dzl-scroll-m-20 dzl-text-4xl dzl-font-extrabold dzl-tracking-tight dzl-lg:text-5xl",
      h2: "dzl-scroll-m-20 dzl-border-b dzl-pb-2 dzl-text-3xl dzl-font-semibold dzl-tracking-tight dzl-first:mt-0",
      h3: "dzl-scroll-m-20 dzl-text-2xl dzl-font-semibold dzl-tracking-tight",
      h4: "dzl-scroll-m-20 dzl-text-xl dzl-font-semibold dzl-tracking-tight",
      h5: "dzl-scroll-m-20 dzl-text-lg dzl-font-semibold dzl-tracking-tight",
      h6: "dzl-scroll-m-20 dzl-text-base dzl-font-semibold dzl-tracking-tight",
      p: "dzl-whitespace-pre-wrap dzl-leading-7",
      blockquote: "dzl-whitespace-pre-wrap dzl-border-l-2 dzl-pl-6 dzl-italic",
      ul: "dzl-my-6 dzl-ml-6 dzl-list-disc [&>li]:mt-2",
      inlineCode:
        "dzl-relative dzl-rounded dzl-bg-muted dzl-px-[0.3rem] dzl-py-[0.2rem] dzl-font-mono dzl-text-sm dzl-font-semibold",
      lead: "dzl-text-xl dzl-text-muted-foreground",
      largeText: "dzl-text-lg dzl-font-semibold",
      smallText: "dzl-text-sm dzl-font-medium dzl-leading-none",
      mutedText: "dzl-text-sm dzl-text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "p",
  },
});

type VariantPropType = VariantProps<typeof typographyVariants>;

const variantElementMap: Record<
  NonNullable<VariantPropType["variant"]>,
  string
> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  p: "p",
  blockquote: "blockquote",
  inlineCode: "code",
  largeText: "div",
  smallText: "small",
  lead: "p",
  mutedText: "p",
  ul: "ul",
};

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  asChild?: boolean;
  as?: string;
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant = "p", as, asChild, ...props }, ref) => {
    const Comp = asChild
      ? Slot
      : (as ?? (variant ? variantElementMap[variant] : undefined) ?? "div");
    return (
      <Comp
        className={cn(typographyVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Typography.displayName = "Typography";

export { Typography, typographyVariants };
export type { VariantPropType };
