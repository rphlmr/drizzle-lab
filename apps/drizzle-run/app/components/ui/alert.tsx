import * as React from "react";

import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "~/utils/cn";

const alertVariants = cva(
  "[&>svg]:dzl-top-4 [&>svg]:dzl-left-4 [&>svg]:dzl-absolute dzl-relative dzl-px-4 dzl-py-3 [&>svg~*]:dzl-pl-7 dzl-border dzl-rounded-lg dzl-w-full [&>svg]:dzl-text-foreground dzl-text-sm [&>svg+div]:dzl-translate-y-[-3px]",
  {
    variants: {
      variant: {
        default: "dzl-bg-background dzl-text-foreground",
        destructive:
          "dzl-dark:dzl-border-destructive dzl-border-destructive/50 dzl-text-destructive [&>svg]:dzl-text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // eslint-disable-next-line jsx-a11y/heading-has-content
    <h5
      ref={ref}
      className={cn("dzl-mb-1 dzl-font-medium dzl-leading-none dzl-tracking-tight", className)}
      {...props}
    />
  )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("dzl-text-sm [&_p]:dzl-leading-relaxed", className)} {...props} />
  )
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
